import { randomBytes } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Campus,
  Course,
  Department,
  EnrolledStudent,
  LeaveApplication,
  LectureSession,
  Section,
  StudentComplianceStats,
  SystemAuditLog,
  Trimester,
  User,
  UserRole,
} from '@/types';
import {
  AttendanceAuditModel,
  CampusModel,
  CourseModel,
  DepartmentModel,
  LeaveApplicationModel,
  LectureSessionModel,
  SectionModel,
  SystemAuditLogModel,
  TrimesterModel,
  UserModel,
} from '@/models';
import { connectToDatabase } from './mongodb';
import { hashPassword, verifyPassword } from './password';

/** Wrong credentials or a disabled account: safe to show the user. */
export class AuthError extends Error {}

/*
 * Data access for the whole app, backed by MongoDB. Every method connects
 * (cached) first, so route handlers just call dbService.
 */

type Actor = { id: string; fullName: string };
const SYSTEM: Actor = { id: 'system', fullName: 'System' };

const db = connectToDatabase;

/** Lean Mongo document → app object (`_id` becomes `id`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function out<T>(doc: any): T {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest } as T;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const outAll = <T>(docs: any[]) => docs.map((d) => out<T>(d));

/** Readable unique id, e.g. "leave-mhz8k2-3f9a1c". */
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

const isDuplicateKey = (err: unknown) => (err as { code?: number })?.code === 11000;

const ATTENDED: AttendanceStatus[] = ['PRESENT', 'LATE', 'EXCUSED', 'MEDICAL_LEAVE', 'ON_DUTY'];

async function nameOf(id: string): Promise<string> {
  const u = await UserModel.findById(id, { fullName: 1 }).lean();
  return u?.fullName ?? id;
}

export const dbService = {
  // --- Academic structure ---
  async getCampuses(): Promise<Campus[]> {
    await db();
    return outAll<Campus>(await CampusModel.find().lean());
  },

  async getDepartments(campusId?: string): Promise<Department[]> {
    await db();
    return outAll<Department>(await DepartmentModel.find(campusId ? { campusId } : {}).lean());
  },

  async getTrimesters(): Promise<Trimester[]> {
    await db();
    return outAll<Trimester>(await TrimesterModel.find().lean());
  },

  async getCourses(deptId?: string): Promise<Course[]> {
    await db();
    return outAll<Course>(await CourseModel.find(deptId ? { departmentId: deptId } : {}).lean());
  },

  async getSections(courseId?: string): Promise<Section[]> {
    await db();
    return outAll<Section>(await SectionModel.find(courseId ? { courseId } : {}).lean());
  },

  // --- Users ---
  async getUsers(): Promise<User[]> {
    await db();
    return outAll<User>(await UserModel.find().lean());
  },

  async getUserById(id: string): Promise<User | undefined> {
    await db();
    const u = await UserModel.findById(id).lean();
    return u ? out<User>(u) : undefined;
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    await db();
    const u = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    return u ? out<User>(u) : undefined;
  },

  async authenticate(email: string, password?: string): Promise<User> {
    const user = await this.getUserByEmail(email);
    // Password checked before active status → errors don't reveal which accounts exist.
    if (!user || !password || !verifyPassword(password, user.password)) {
      throw new AuthError('Invalid email or password.');
    }
    if (!user.isActive) {
      throw new AuthError('This user account has been deactivated. Please contact your administrator.');
    }
    await this.addSystemAudit({
      userId: user.id,
      userName: user.fullName,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      details: `Signed in as ${user.role.replace('_', ' ').toLowerCase()}.`,
    });
    return user;
  },

  async createUser(
    data: {
      email: string;
      fullName: string;
      role: UserRole;
      campusId: string;
      departmentId?: string;
      password?: string;
      employeeCode?: string;
      enrollmentNumber?: string;
      academicYear?: string;
    },
    actor: Actor = SYSTEM
  ): Promise<User> {
    await db();
    const id = newId('user');
    const newUser: User = {
      id,
      ssoId: `sso_${id}`,
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      role: data.role,
      campusId: data.campusId,
      departmentId: data.departmentId,
      isActive: true,
      password: hashPassword(data.password || randomBytes(12).toString('base64url')),
      createdAt: new Date().toISOString(),
      studentProfile:
        data.role === 'STUDENT'
          ? {
              enrollmentNumber: data.enrollmentNumber || `STU-${randomBytes(3).toString('hex').toUpperCase()}`,
              academicYear: data.academicYear || '2026-27',
              enrolledSections: [],
            }
          : undefined,
      facultyProfile:
        data.role === 'FACULTY' || data.role === 'HOD'
          ? {
              employeeCode: data.employeeCode || `FAC-${randomBytes(3).toString('hex').toUpperCase()}`,
              designation: data.role === 'HOD' ? 'Head of Department' : 'Assistant Professor',
              assignedCourses: [],
            }
          : undefined,
    };
    try {
      const { id: _id, ...rest } = newUser;
      await UserModel.create({ _id, ...rest });
    } catch (err) {
      if (isDuplicateKey(err)) throw new Error('A user with this email address already exists.');
      throw err;
    }
    await this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: id,
      details: `Created new user ${newUser.fullName} (${newUser.role}, ${newUser.email})`,
    });
    return newUser;
  },

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>, actor: Actor = SYSTEM): Promise<User> {
    await db();
    const user = await UserModel.findById(id).lean();
    if (!user) throw new Error('User not found.');

    // Whitelist: never let a request body overwrite id/ssoId/createdAt or store a raw password.
    const { fullName, email, role, campusId, departmentId, isActive, password } = updates;
    const set: Record<string, unknown> = {};
    if (email && email.trim().toLowerCase() !== user.email) set.email = email.trim().toLowerCase();
    if (fullName) set.fullName = fullName.trim();
    if (role) set.role = role;
    if (campusId) set.campusId = campusId;
    if (departmentId !== undefined) set.departmentId = departmentId;
    if (typeof isActive === 'boolean') set.isActive = isActive;
    if (password) set.password = hashPassword(password);

    let updated;
    try {
      updated = await UserModel.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    } catch (err) {
      if (isDuplicateKey(err)) throw new Error('A user with this email address already exists.');
      throw err;
    }
    await this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_UPDATED',
      entityName: 'User',
      entityId: id,
      details: `Updated details for ${updated!.fullName} (${updated!.email})`,
    });
    return out<User>(updated);
  },

  async deleteUser(id: string, actor: Actor = SYSTEM): Promise<{ success: boolean }> {
    await db();
    const user = await UserModel.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
    if (!user) throw new Error('User not found.');
    await this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_DEACTIVATED',
      entityName: 'User',
      entityId: id,
      details: `Deactivated user account ${user.fullName} (${user.email})`,
    });
    return { success: true };
  },

  // --- Lectures & attendance ---
  async getSessions(filter?: {
    courseId?: string;
    sectionId?: string;
    facultyId?: string;
    isLocked?: boolean;
  }): Promise<LectureSession[]> {
    await db();
    const q: Record<string, unknown> = {};
    if (filter?.courseId) q.courseId = filter.courseId;
    if (filter?.sectionId) q.sectionId = filter.sectionId;
    if (filter?.facultyId) q.facultyId = filter.facultyId;
    if (filter?.isLocked !== undefined) q.isLocked = filter.isLocked;
    return outAll<LectureSession>(await LectureSessionModel.find(q).sort({ sectionId: 1, sessionNumber: 1 }).lean());
  },

  async getSessionById(sessionId: string): Promise<LectureSession | null> {
    await db();
    const s = await LectureSessionModel.findById(sessionId).lean();
    return s ? out<LectureSession>(s) : null;
  },

  async createSession(data: {
    campusId: string;
    departmentId: string;
    trimesterId: string;
    courseId: string;
    sectionId: string;
    facultyId: string;
    lectureDate: string;
    sessionNumber: number;
    sessionTitle: string;
    periods: number;
  }): Promise<LectureSession> {
    await db();
    const section = await SectionModel.findById(data.sectionId).lean();
    const students: EnrolledStudent[] = section?.enrolledStudents ?? [];
    const now = new Date().toISOString();
    const records: AttendanceRecord[] = students.map((stu) => ({
      studentId: stu.studentId,
      enrollmentNumber: stu.enrollmentNumber,
      studentName: stu.fullName,
      status: 'PRESENT',
      markedAt: now,
    }));
    const session: LectureSession = {
      id: newId('session'),
      ...data,
      isLocked: false,
      records,
      summary: this._calculateSummary(records),
    };
    try {
      const { id: _id, ...rest } = session;
      await LectureSessionModel.create({ _id, ...rest });
    } catch (err) {
      // The unique indexes allow one open draft per class and unique lecture numbers.
      if (isDuplicateKey(err)) throw new Error('Finish or submit the open draft for this class first.');
      throw err;
    }
    return session;
  },

  async saveDraftAttendance(sessionId: string, records: AttendanceRecord[]): Promise<LectureSession> {
    await db();
    const session = await LectureSessionModel.findById(sessionId).lean();
    if (!session) throw new Error('Session not found');
    if (session.isLocked) throw new Error('Cannot edit locked session');

    const merged = this._mergeMarks(session.records as AttendanceRecord[], records);
    const updated = await LectureSessionModel.findOneAndUpdate(
      { _id: sessionId, isLocked: false },
      { $set: { records: merged, summary: this._calculateSummary(merged) } },
      { new: true }
    ).lean();
    if (!updated) throw new Error('Cannot edit locked session');
    return out<LectureSession>(updated);
  },

  /**
   * Apply client marks (status/remarks only) onto the server-side roster.
   * The roster itself is never replaced by client data.
   */
  _mergeMarks(roster: AttendanceRecord[], marks: AttendanceRecord[]): AttendanceRecord[] {
    const VALID = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'MEDICAL_LEAVE', 'ON_DUTY'];
    const byId = new Map(marks.map((m) => [m.studentId, m]));
    for (const id of byId.keys()) {
      if (!roster.some((r) => r.studentId === id)) {
        throw new Error(`Student ${id} is not on this class roster.`);
      }
    }
    return roster.map((r) => {
      const m = byId.get(r.studentId);
      if (!m) return r;
      if (!VALID.includes(m.status)) throw new Error(`Invalid status for ${r.studentName}.`);
      return {
        ...r,
        status: m.status,
        remarks: typeof m.remarks === 'string' ? m.remarks.slice(0, 200) : r.remarks,
        markedAt: m.status !== r.status ? new Date().toISOString() : r.markedAt,
      };
    });
  },

  async submitAndLockSession(sessionId: string, facultyId: string, records: AttendanceRecord[]): Promise<LectureSession> {
    await db();
    const session = await LectureSessionModel.findById(sessionId).lean();
    if (!session) throw new Error('Session not found');
    if (session.isLocked) throw new Error('This attendance session is locked and immutable.');
    if (session.records.length === 0) throw new Error('This class has no students on its roster.');

    const merged = this._mergeMarks(session.records as AttendanceRecord[], records);
    const summary = this._calculateSummary(merged);
    // Conditional update: only one request can ever lock a lecture.
    const updated = await LectureSessionModel.findOneAndUpdate(
      { _id: sessionId, isLocked: false },
      {
        $set: {
          records: merged,
          summary,
          isLocked: true,
          submittedAt: new Date().toISOString(),
          submittedBy: facultyId,
        },
      },
      { new: true }
    ).lean();
    if (!updated) throw new Error('This attendance session is locked and immutable.');

    const periods = updated.periods ?? 1;
    await this.addSystemAudit({
      userId: facultyId,
      userName: await nameOf(facultyId),
      action: 'ATTENDANCE_SUBMITTED_AND_LOCKED',
      entityName: 'LectureSession',
      entityId: sessionId,
      details: `Lecture ${updated.sessionNumber} (${periods} period${periods > 1 ? 's' : ''}) locked with ${summary.presentCount} present out of ${summary.totalStudents}`,
    });
    return out<LectureSession>(updated);
  },

  async copyPreviousSession(currentSessionId: string): Promise<AttendanceRecord[]> {
    await db();
    const current = await LectureSessionModel.findById(currentSessionId).lean();
    if (!current) throw new Error('Current session not found');
    const previous = await LectureSessionModel.findOne({
      courseId: current.courseId,
      sectionId: current.sectionId,
      _id: { $ne: currentSessionId },
      isLocked: true,
    })
      .sort({ sessionNumber: -1 })
      .lean();
    if (!previous) throw new Error('No previous completed sessions available to copy from.');

    const prevMap = new Map(previous.records.map((r) => [r.studentId, r.status]));
    // Return a proposal only; nothing is saved until the faculty saves the draft.
    return (current.records as AttendanceRecord[]).map((r) => ({
      ...r,
      status: (prevMap.get(r.studentId) as AttendanceStatus) || 'PRESENT',
    }));
  },

  // --- Leave ---
  async getLeaves(filter?: { studentId?: string; departmentId?: string; status?: string }): Promise<LeaveApplication[]> {
    await db();
    const q: Record<string, unknown> = {};
    if (filter?.studentId) q.studentId = filter.studentId;
    if (filter?.departmentId) q.departmentId = filter.departmentId;
    if (filter?.status) q.status = filter.status;
    return outAll<LeaveApplication>(await LeaveApplicationModel.find(q).sort({ createdAt: -1 }).lean());
  },

  async getLeaveById(id: string): Promise<LeaveApplication | null> {
    await db();
    const l = await LeaveApplicationModel.findById(id).lean();
    return l ? out<LeaveApplication>(l) : null;
  },

  async submitLeave(data: {
    studentId: string;
    studentName: string;
    enrollmentNumber: string;
    campusId: string;
    departmentId: string;
    leaveType: 'CASUAL' | 'MEDICAL' | 'ON_DUTY' | 'BEREAVEMENT';
    startDate: string;
    endDate: string;
    reason: string;
    documentUrl?: string;
  }): Promise<LeaveApplication> {
    await db();
    const leave: LeaveApplication = {
      id: newId('leave'),
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    const { id: _id, ...rest } = leave;
    await LeaveApplicationModel.create({ _id, ...rest });
    await this.addSystemAudit({
      userId: data.studentId,
      userName: data.studentName,
      action: 'LEAVE_APPLICATION_SUBMITTED',
      entityName: 'LeaveApplication',
      entityId: leave.id,
      details: `${data.leaveType} leave applied from ${data.startDate} to ${data.endDate}`,
    });
    return leave;
  },

  /**
   * Approve or reject a pending leave. Approval excuses the student's ABSENT
   * marks in that date range. Everything happens in one transaction, so the
   * leave, the lectures and the audit entries change together or not at all.
   */
  async reviewLeave(
    leaveId: string,
    hodUserId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewComments: string
  ): Promise<{ leave: LeaveApplication; updatedSessionCount: number }> {
    const conn = await db();
    const hodName = await nameOf(hodUserId);
    let result: { leave: LeaveApplication; updatedSessionCount: number } | undefined;

    await conn.connection.transaction(async (tx: ClientSession) => {
      const leave = await LeaveApplicationModel.findOneAndUpdate(
        { _id: leaveId, status: 'PENDING' },
        { $set: { status, reviewedBy: hodUserId, reviewComments, reviewedAt: new Date().toISOString() } },
        { new: true, session: tx }
      ).lean();
      if (!leave) {
        const exists = await LeaveApplicationModel.exists({ _id: leaveId }).session(tx);
        throw new Error(exists ? 'This leave request has already been decided.' : 'Leave application not found');
      }

      let updatedSessionCount = 0;
      if (status === 'APPROVED') {
        const target: AttendanceStatus =
          leave.leaveType === 'MEDICAL' ? 'MEDICAL_LEAVE' : leave.leaveType === 'ON_DUTY' ? 'ON_DUTY' : 'EXCUSED';
        const sessions = await LectureSessionModel.find(
          {
            lectureDate: { $gte: leave.startDate, $lte: leave.endDate },
            records: { $elemMatch: { studentId: leave.studentId, status: 'ABSENT' } },
          },
          null,
          { session: tx }
        ).lean();

        const now = new Date().toISOString();
        for (const s of sessions) {
          // Only absences are excused; a lecture the student attended stays as marked.
          const records = (s.records as AttendanceRecord[]).map((r) =>
            r.studentId === leave.studentId && r.status === 'ABSENT'
              ? { ...r, status: target, remarks: `Leave approved #${leave._id}` }
              : r
          );
          await LectureSessionModel.updateOne(
            { _id: s._id },
            { $set: { records, summary: this._calculateSummary(records) } },
            { session: tx }
          );
          await AttendanceAuditModel.create(
            [
              {
                _id: newId('audit-att'),
                sessionId: s._id,
                studentId: leave.studentId,
                studentName: leave.studentName,
                previousStatus: 'ABSENT',
                newStatus: target,
                reason: `Automated leave integration #${leave._id} (${leave.leaveType})`,
                changedBy: hodUserId,
                changedByName: hodName,
                createdAt: now,
              },
            ],
            { session: tx }
          );
          updatedSessionCount++;
        }
      }

      await this.addSystemAudit(
        {
          userId: hodUserId,
          userName: hodName,
          action: `LEAVE_${status}`,
          entityName: 'LeaveApplication',
          entityId: leaveId,
          details: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${leave.studentName}'s ${leave.leaveType
            .toLowerCase()
            .replace('_', ' ')} leave (${leave.startDate} to ${leave.endDate}); ${updatedSessionCount} absence(s) excused.`,
        },
        tx
      );
      result = { leave: out<LeaveApplication>(leave), updatedSessionCount };
    });

    return result!;
  },

  // --- Compliance (75% rule, weighted by periods) ---
  async getComplianceStats(courseId: string, sectionId: string): Promise<StudentComplianceStats[]> {
    await db();
    const [locked, course, section] = await Promise.all([
      LectureSessionModel.find({ courseId, sectionId, isLocked: true }, { records: 1, periods: 1 }).lean(),
      CourseModel.findById(courseId).lean(),
      SectionModel.findById(sectionId).lean(),
    ]);

    // Weighted by periods: a 2-period lab counts twice.
    const totalPeriods = locked.reduce((n, s) => n + (s.periods ?? 1), 0);
    if (totalPeriods === 0) return [];

    const stats: StudentComplianceStats[] = (section?.enrolledStudents ?? []).map((stu) => {
      let attended = 0;
      for (const s of locked) {
        const r = s.records.find((rec) => rec.studentId === stu.studentId);
        if (r && ATTENDED.includes(r.status as AttendanceStatus)) attended += s.periods ?? 1;
      }
      const percentage = Number(((attended / totalPeriods) * 100).toFixed(1));
      const isDefaulter = percentage < 75.0;
      // Periods in a row needed to reach 75%: (a + x) / (t + x) >= 0.75 → x >= (0.75t − a) / 0.25
      const neededFor75 = isDefaulter ? Math.max(1, Math.ceil((0.75 * totalPeriods - attended) / 0.25)) : 0;
      return {
        studentId: stu.studentId,
        enrollmentNumber: stu.enrollmentNumber,
        fullName: stu.fullName,
        courseId,
        courseCode: course?.code ?? courseId,
        courseTitle: course?.title ?? '',
        totalPeriods,
        attendedPeriods: attended,
        percentage,
        isDefaulter,
        neededFor75,
      };
    });
    return stats.sort((a, b) => a.percentage - b.percentage);
  },

  async getStudentPersonalSummary(studentId: string) {
    await db();
    const [sessions, courses, sections] = await Promise.all([
      LectureSessionModel.find({ isLocked: true, 'records.studentId': studentId }).lean(),
      CourseModel.find().lean(),
      SectionModel.find({}, { kind: 1 }).lean(),
    ]);
    const courseById = new Map(courses.map((c) => [c._id, c]));
    const labSections = new Set(sections.filter((s) => s.kind === 'LAB').map((s) => s._id));

    let total = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;
    const byCourse = new Map<string, { total: number; attended: number; code: string; title: string }>();

    for (const s of sessions) {
      const rec = s.records.find((r) => r.studentId === studentId);
      if (!rec) continue;
      // All counts are in periods (a 2-period lab adds 2).
      const p = s.periods ?? 1;
      total += p;
      if (rec.status === 'PRESENT') present += p;
      else if (rec.status === 'ABSENT') absent += p;
      else if (rec.status === 'LATE') late += p;
      else excused += p; // EXCUSED, MEDICAL_LEAVE, ON_DUTY

      const c = courseById.get(s.courseId);
      const row = byCourse.get(s.courseId) ?? { total: 0, attended: 0, code: c?.code ?? s.courseId, title: c?.title ?? 'Course' };
      row.total += p;
      if (rec.status !== 'ABSENT') row.attended += p;
      byCourse.set(s.courseId, row);
    }

    const overallPercentage = total > 0 ? Number((((present + late + excused) / total) * 100).toFixed(1)) : 100;

    return {
      totalPeriods: total,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      excusedCount: excused,
      overallPercentage,
      isCompliant: overallPercentage >= 75.0,
      courses: Array.from(byCourse.entries()).map(([courseId, v]) => {
        const percentage = Number(((v.attended / v.total) * 100).toFixed(1));
        return { courseId, code: v.code, title: v.title, total: v.total, attended: v.attended, percentage, isDefaulter: percentage < 75.0 };
      }),
      // Newest first: one row per locked lecture this student was on the roster for.
      history: sessions
        .map((s) => {
          const rec = s.records.find((r) => r.studentId === studentId)!;
          return {
            sessionId: s._id,
            lectureDate: s.lectureDate,
            courseCode: courseById.get(s.courseId)?.code ?? s.courseId,
            sessionNumber: s.sessionNumber,
            sessionTitle: s.sessionTitle,
            periods: s.periods ?? 1,
            isLab: labSections.has(s.sectionId),
            status: rec.status,
            remarks: rec.remarks,
          };
        })
        .sort((x, y) => y.lectureDate.localeCompare(x.lectureDate)),
    };
  },

  // --- Bulk student import (CSV) ---
  /**
   * Add students to a class roster. Rows with an email also get a login:
   * an existing student account is linked, otherwise a new account is created
   * with a random temporary password, returned once so the admin can share it.
   */
  async importStudentsRoster(
    sectionId: string,
    importedList: { enrollmentNumber: string; fullName: string; email: string }[],
    actor: Actor = SYSTEM
  ): Promise<{
    totalReceived: number;
    successfullyImported: number;
    duplicates: number;
    invalidRecords: number;
    records: EnrolledStudent[];
    accounts: { enrollmentNumber: string; fullName: string; email: string; tempPassword: string }[];
    withoutLogin: number;
  }> {
    await db();
    const section = await SectionModel.findById(sectionId).lean();
    if (!section) throw new Error('Section not found');

    let duplicates = 0;
    let invalidRecords = 0;
    let withoutLogin = 0;
    const existing = new Set(section.enrolledStudents.map((s) => s.enrollmentNumber.trim().toUpperCase()));
    const added: EnrolledStudent[] = [];
    const accounts: { enrollmentNumber: string; fullName: string; email: string; tempPassword: string }[] = [];

    for (const item of importedList) {
      const enroll = item.enrollmentNumber?.trim().toUpperCase();
      const name = item.fullName?.trim();
      const email = item.email?.trim().toLowerCase() || '';
      if (!enroll || !name || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        invalidRecords++;
        continue;
      }
      if (existing.has(enroll)) {
        duplicates++;
        continue;
      }

      let studentId = newId('stu');
      if (email) {
        const user = await UserModel.findOne({ email }).lean();
        if (user && user.role !== 'STUDENT') {
          invalidRecords++; // email belongs to a staff account
          continue;
        }
        if (user) {
          studentId = user._id;
          await UserModel.updateOne({ _id: user._id }, { $addToSet: { 'studentProfile.enrolledSections': sectionId } });
        } else {
          const tempPassword = randomBytes(9).toString('base64url');
          await UserModel.create({
            _id: studentId,
            ssoId: `sso_${studentId}`,
            email,
            fullName: name,
            role: 'STUDENT',
            campusId: section.campusId,
            departmentId: section.departmentId,
            isActive: true,
            password: hashPassword(tempPassword),
            createdAt: new Date().toISOString(),
            studentProfile: { enrollmentNumber: enroll, academicYear: '2026-27', enrolledSections: [sectionId] },
          });
          accounts.push({ enrollmentNumber: enroll, fullName: name, email, tempPassword });
        }
      } else {
        withoutLogin++;
      }
      existing.add(enroll);
      added.push({ studentId, enrollmentNumber: enroll, fullName: name, email });
    }

    const updated = await SectionModel.findByIdAndUpdate(
      sectionId,
      { $push: { enrolledStudents: { $each: added } } },
      { new: true }
    ).lean();

    await this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'BULK_STUDENT_IMPORT',
      entityName: 'Section',
      entityId: sectionId,
      details: `Imported ${added.length} students into ${section.name} (${accounts.length} new logins). Duplicates: ${duplicates}, Invalid: ${invalidRecords}`,
    });

    return {
      totalReceived: importedList.length,
      successfullyImported: added.length,
      duplicates,
      invalidRecords,
      records: updated?.enrolledStudents ?? [],
      accounts,
      withoutLogin,
    };
  },

  // --- Audit log (append-only) ---
  async getSystemAuditLogs(): Promise<SystemAuditLog[]> {
    await db();
    return outAll<SystemAuditLog>(await SystemAuditLogModel.find().sort({ timestamp: -1 }).limit(500).lean());
  },

  async addSystemAudit(entry: Omit<SystemAuditLog, 'id' | 'timestamp'>, tx?: ClientSession): Promise<void> {
    await db();
    await SystemAuditLogModel.create([{ _id: newId('audit-log'), ...entry, timestamp: new Date().toISOString() }], {
      session: tx,
    });
  },

  // --- Helpers ---
  _calculateSummary(records: AttendanceRecord[]) {
    const count = (s: AttendanceStatus) => records.filter((r) => r.status === s).length;
    return {
      totalStudents: records.length,
      presentCount: count('PRESENT'),
      absentCount: count('ABSENT'),
      lateCount: count('LATE'),
      excusedCount: count('EXCUSED'),
      medicalLeaveCount: count('MEDICAL_LEAVE'),
      onDutyCount: count('ON_DUTY'),
    };
  },
};

// Re-exported for scripts that need the raw connection (e.g. db:reset).
export { mongoose };
