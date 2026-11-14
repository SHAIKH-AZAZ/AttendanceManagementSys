import {
  Campus,
  Department,
  Trimester,
  Course,
  Section,
  User,
  LectureSession,
  AttendanceRecord,
  LeaveApplication,
  AttendanceAudit,
  SystemAuditLog,
  ComplianceThreshold,
  StudentComplianceStats,
  EnrolledStudent,
} from '@/types';
import {
  INITIAL_CAMPUSES,
  INITIAL_DEPARTMENTS,
  INITIAL_TRIMESTERS,
  INITIAL_COURSES,
  INITIAL_SECTIONS,
  INITIAL_USERS,
  INITIAL_SESSIONS,
  INITIAL_LEAVES,
  INITIAL_AUDIT_LOGS,
  INITIAL_THRESHOLDS,
  ROSTER_STUDENTS,
} from './seed-data';
import { hashPassword, verifyPassword } from './password';

// Reactive in-memory state (resilient fallback when MongoDB connection is establishing or offline)
class DatabaseState {
  campuses: Campus[] = [...INITIAL_CAMPUSES];
  departments: Department[] = [...INITIAL_DEPARTMENTS];
  trimesters: Trimester[] = [...INITIAL_TRIMESTERS];
  courses: Course[] = [...INITIAL_COURSES];
  sections: Section[] = [...INITIAL_SECTIONS];
  // Seed passwords are plaintext in seed-data; only hashes live in state.
  users: User[] = INITIAL_USERS.map((u) => ({
    ...u,
    password: u.password ? hashPassword(u.password) : undefined,
  }));
  sessions: LectureSession[] = JSON.parse(JSON.stringify(INITIAL_SESSIONS));
  leaves: LeaveApplication[] = JSON.parse(JSON.stringify(INITIAL_LEAVES));
  audits: AttendanceAudit[] = [];
  systemAuditLogs: SystemAuditLog[] = [...INITIAL_AUDIT_LOGS];
  thresholds: ComplianceThreshold[] = [...INITIAL_THRESHOLDS];
}

// Global persistence across Next.js dev server hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __attendease_db_state_v4: DatabaseState | undefined;
}

const state: DatabaseState =
  global.__attendease_db_state_v4 || new DatabaseState();

if (!global.__attendease_db_state_v4) {
  global.__attendease_db_state_v4 = state;
}

type Actor = { id: string; fullName: string };
const SYSTEM: Actor = { id: 'system', fullName: 'System' };
const nameOf = (id: string) => state.users.find((u) => u.id === id)?.fullName ?? id;

export const dbService = {
  // --- Metas ---
  async getCampuses(): Promise<Campus[]> {
    return state.campuses;
  },

  async getDepartments(campusId?: string): Promise<Department[]> {
    if (campusId) {
      return state.departments.filter((d) => d.campusId === campusId);
    }
    return state.departments;
  },

  async getTrimesters(): Promise<Trimester[]> {
    return state.trimesters;
  },

  async getCourses(deptId?: string): Promise<Course[]> {
    if (deptId) {
      return state.courses.filter((c) => c.departmentId === deptId);
    }
    return state.courses;
  },

  async getSections(courseId?: string): Promise<Section[]> {
    if (courseId) {
      return state.sections.filter((s) => s.courseId === courseId);
    }
    return state.sections;
  },

  async getUsers(): Promise<User[]> {
    return state.users;
  },

  async getUserById(id: string): Promise<User | undefined> {
    return state.users.find((u) => u.id === id);
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    return state.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
  },

  async authenticate(
    email: string,
    password?: string
  ): Promise<User> {
    const user = await this.getUserByEmail(email);
    // Password checked before active status → errors don't reveal which accounts exist.
    if (!user || !password || !verifyPassword(password, user.password)) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('This user account has been deactivated. Please contact your administrator.');
    }

    this.addSystemAudit({
      userId: user.id,
      userName: user.fullName,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      details: `Signed in as ${user.role.replace("_", " ").toLowerCase()}.`,
    });

    return user;
  },

  async createUser(data: {
    email: string;
    fullName: string;
    role: import('@/types').UserRole;
    campusId: string;
    departmentId?: string;
    password?: string;
    employeeCode?: string;
    enrollmentNumber?: string;
    academicYear?: string;
  }, actor: Actor = SYSTEM): Promise<User> {
    const existing = await this.getUserByEmail(data.email);
    if (existing) {
      throw new Error('A user with this email address already exists.');
    }

    const userId = `user-${Date.now()}`;
    const newUser: User = {
      id: userId,
      ssoId: `sso_${userId}`,
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      role: data.role,
      campusId: data.campusId,
      departmentId: data.departmentId,
      isActive: true,
      password: hashPassword(data.password || 'welcome123'),
      createdAt: new Date().toISOString(),
      studentProfile:
        data.role === 'STUDENT'
          ? {
              enrollmentNumber:
                data.enrollmentNumber ||
                `CS-2026-${Math.floor(100 + Math.random() * 900)}`,
              academicYear: data.academicYear || '2026-2027',
              enrolledSections: ['sec-ds-a'],
            }
          : undefined,
      facultyProfile:
        data.role === 'FACULTY'
          ? {
              employeeCode:
                data.employeeCode ||
                `FAC-${Math.floor(100 + Math.random() * 900)}`,
              designation: 'Assistant Professor',
              assignedCourses: [{ courseId: 'course-ds', sectionId: 'sec-ds-a' }],
            }
          : undefined,
    };

    state.users.push(newUser);

    this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: newUser.id,
      details: `Created new user ${newUser.fullName} (${newUser.role}, ${newUser.email})`,
    });

    return newUser;
  },

  async updateUser(
    id: string,
    updates: Partial<Omit<User, 'id'>>,
    actor: Actor = SYSTEM
  ): Promise<User> {
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found.');

    // Whitelist: never let a request body overwrite id/ssoId/createdAt or store a raw password.
    const { fullName, email, role, campusId, departmentId, isActive, password } = updates;
    if (email && email.trim().toLowerCase() !== user.email) {
      const taken = await this.getUserByEmail(email);
      if (taken) throw new Error('A user with this email address already exists.');
      user.email = email.trim().toLowerCase();
    }
    if (fullName) user.fullName = fullName.trim();
    if (role) user.role = role;
    if (campusId) user.campusId = campusId;
    if (departmentId !== undefined) user.departmentId = departmentId;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = hashPassword(password);

    this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_UPDATED',
      entityName: 'User',
      entityId: user.id,
      details: `Updated details for ${user.fullName} (${user.email})`,
    });

    return user;
  },

  async deleteUser(id: string, actor: Actor = SYSTEM): Promise<{ success: boolean }> {
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found.');

    user.isActive = false; // Soft deactivate

    this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'USER_DEACTIVATED',
      entityName: 'User',
      entityId: user.id,
      details: `Deactivated user account ${user.fullName} (${user.email})`,
    });

    return { success: true };
  },

  // --- Sessions & Attendance ---
  async getSessions(filter?: {
    courseId?: string;
    sectionId?: string;
    facultyId?: string;
    isLocked?: boolean;
  }): Promise<LectureSession[]> {
    let list = state.sessions;
    if (filter?.courseId) list = list.filter((s) => s.courseId === filter.courseId);
    if (filter?.sectionId) list = list.filter((s) => s.sectionId === filter.sectionId);
    if (filter?.facultyId) list = list.filter((s) => s.facultyId === filter.facultyId);
    if (filter?.isLocked !== undefined)
      list = list.filter((s) => s.isLocked === filter.isLocked);
    return list;
  },

  async getSessionById(sessionId: string): Promise<LectureSession | null> {
    const session = state.sessions.find((s) => s.id === sessionId);
    return session ? JSON.parse(JSON.stringify(session)) : null;
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
  }): Promise<LectureSession> {
    const section = state.sections.find((s) => s.id === data.sectionId);
    const students = section ? section.enrolledStudents : ROSTER_STUDENTS;

    const records: AttendanceRecord[] = students.map((stu) => ({
      studentId: stu.studentId,
      enrollmentNumber: stu.enrollmentNumber,
      studentName: stu.fullName,
      status: 'PRESENT',
      markedAt: new Date().toISOString(),
    }));

    const newSession: LectureSession = {
      id: `session-${Date.now()}`,
      ...data,
      isLocked: false,
      records,
      summary: {
        totalStudents: records.length,
        presentCount: records.length,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        medicalLeaveCount: 0,
        onDutyCount: 0,
      },
    };

    state.sessions.push(newSession);
    return newSession;
  },

  async saveDraftAttendance(
    sessionId: string,
    records: AttendanceRecord[]
  ): Promise<LectureSession> {
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    if (session.isLocked) throw new Error('Cannot edit locked session');

    session.records = this._mergeMarks(session.records, records);
    session.summary = this._calculateSummary(session.records);
    return session;
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

  async submitAndLockSession(
    sessionId: string,
    facultyId: string,
    records: AttendanceRecord[]
  ): Promise<LectureSession> {
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    if (session.isLocked) {
      throw new Error('This attendance session is locked and immutable.');
    }
    if (session.records.length === 0) {
      throw new Error('This class has no students on its roster.');
    }

    session.records = this._mergeMarks(session.records, records);
    session.summary = this._calculateSummary(session.records);
    session.isLocked = true;
    session.submittedAt = new Date().toISOString();
    session.submittedBy = facultyId;

    // Log to system audit
    this.addSystemAudit({
      userId: facultyId,
      userName: nameOf(facultyId),
      action: 'ATTENDANCE_SUBMITTED_AND_LOCKED',
      entityName: 'LectureSession',
      entityId: sessionId,
      details: `Session #${session.sessionNumber} locked with ${session.summary.presentCount} present out of ${session.summary.totalStudents}`,
    });

    return session;
  },

  async copyPreviousSession(
    currentSessionId: string
  ): Promise<AttendanceRecord[]> {
    const currentSession = state.sessions.find((s) => s.id === currentSessionId);
    if (!currentSession) throw new Error('Current session not found');

    // Find preceding session for the same course and section
    const priorSessions = state.sessions
      .filter(
        (s) =>
          s.courseId === currentSession.courseId &&
          s.sectionId === currentSession.sectionId &&
          s.id !== currentSessionId &&
          s.isLocked
      )
      .sort((a, b) => b.sessionNumber - a.sessionNumber);

    if (priorSessions.length === 0) {
      throw new Error('No previous completed sessions available to copy from.');
    }

    const previousSession = priorSessions[0];
    const prevMap = new Map(
      previousSession.records.map((r) => [r.studentId, r.status])
    );

    // Return a proposal only; nothing is saved until the faculty saves the draft.
    return currentSession.records.map((r) => ({
      ...r,
      status: prevMap.get(r.studentId) || 'PRESENT',
    }));
  },

  // --- Leaves ---
  async getLeaves(filter?: {
    studentId?: string;
    departmentId?: string;
    status?: string;
  }): Promise<LeaveApplication[]> {
    let list = state.leaves;
    if (filter?.studentId) list = list.filter((l) => l.studentId === filter.studentId);
    if (filter?.departmentId)
      list = list.filter((l) => l.departmentId === filter.departmentId);
    if (filter?.status) list = list.filter((l) => l.status === filter.status);
    return list;
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
    const newLeave: LeaveApplication = {
      id: `leave-${Date.now()}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    state.leaves.unshift(newLeave);

    this.addSystemAudit({
      userId: data.studentId,
      userName: data.studentName,
      action: 'LEAVE_APPLICATION_SUBMITTED',
      entityName: 'LeaveApplication',
      entityId: newLeave.id,
      details: `${data.leaveType} leave applied from ${data.startDate} to ${data.endDate}`,
    });

    return newLeave;
  },

  async reviewLeave(
    leaveId: string,
    hodUserId: string,
    status: 'APPROVED' | 'REJECTED',
    reviewComments: string
  ): Promise<{ leave: LeaveApplication; updatedSessionCount: number }> {
    const leave = state.leaves.find((l) => l.id === leaveId);
    if (!leave) throw new Error('Leave application not found');

    leave.status = status;
    leave.reviewedBy = hodUserId;
    leave.reviewComments = reviewComments;
    leave.reviewedAt = new Date().toISOString();

    let updatedSessionCount = 0;

    // RULE 9 & 10: Approved leave automatically excuses overlapping attendance
    if (status === 'APPROVED') {
      const targetStatus =
        leave.leaveType === 'MEDICAL'
          ? 'MEDICAL_LEAVE'
          : leave.leaveType === 'ON_DUTY'
          ? 'ON_DUTY'
          : 'EXCUSED';

      state.sessions.forEach((session) => {
        if (
          session.lectureDate >= leave.startDate &&
          session.lectureDate <= leave.endDate
        ) {
          const rec = session.records.find((r) => r.studentId === leave.studentId);
          // Only absences are excused; a lecture the student attended stays as marked.
          if (rec && rec.status === 'ABSENT') {
            const previousStatus = rec.status;
            rec.status = targetStatus;
            rec.remarks = `Leave Approved #${leave.id}`;
            session.summary = this._calculateSummary(session.records);
            updatedSessionCount++;

            state.audits.push({
              id: `audit-att-${Date.now()}-${session.id}`,
              sessionId: session.id,
              studentId: leave.studentId,
              studentName: leave.studentName,
              previousStatus,
              newStatus: targetStatus,
              reason: `Automated leave integration #${leave.id} (${leave.leaveType})`,
              changedBy: hodUserId,
              changedByName: nameOf(hodUserId),
              createdAt: new Date().toISOString(),
            });
          }
        }
      });
    }

    this.addSystemAudit({
      userId: hodUserId,
      userName: nameOf(hodUserId),
      action: `LEAVE_${status}`,
      entityName: 'LeaveApplication',
      entityId: leave.id,
      details: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} ${leave.studentName}'s ${leave.leaveType.toLowerCase().replace('_', ' ')} leave (${leave.startDate} to ${leave.endDate}); ${updatedSessionCount} absence(s) excused.`,
    });

    return { leave, updatedSessionCount };
  },

  // --- Compliance & Defaulters (75% Threshold Engine) ---
  async getComplianceStats(courseId: string, sectionId: string): Promise<StudentComplianceStats[]> {
    const lockedSessions = state.sessions.filter(
      (s) => s.courseId === courseId && s.sectionId === sectionId && s.isLocked
    );

    const totalLectures = lockedSessions.length;
    if (totalLectures === 0) return [];

    const course = state.courses.find((c) => c.id === courseId);
    const section = state.sections.find((s) => s.id === sectionId);
    const students = section?.enrolledStudents || ROSTER_STUDENTS;

    const stats: StudentComplianceStats[] = students.map((stu) => {
      let attended = 0;

      lockedSessions.forEach((sess) => {
        const r = sess.records.find((rec) => rec.studentId === stu.studentId);
        if (r) {
          if (
            r.status === 'PRESENT' ||
            r.status === 'LATE' ||
            r.status === 'EXCUSED' ||
            r.status === 'MEDICAL_LEAVE' ||
            r.status === 'ON_DUTY'
          ) {
            attended++;
          }
        }
      });

      const percentage = Number(((attended / totalLectures) * 100).toFixed(1));
      const isDefaulter = percentage < 75.0;

      // Calculate how many consecutive attendances needed to reach 75%
      // (attended + x) / (totalLectures + x) >= 0.75 => x >= (0.75 * total - attended) / 0.25
      let neededFor75 = 0;
      if (isDefaulter) {
        neededFor75 = Math.max(
          1,
          Math.ceil((0.75 * totalLectures - attended) / 0.25)
        );
      }

      return {
        studentId: stu.studentId,
        enrollmentNumber: stu.enrollmentNumber,
        fullName: stu.fullName,
        courseId,
        courseCode: course?.code || 'CS-301',
        courseTitle: course?.title || 'Data Structures',
        totalLectures,
        attendedLectures: attended,
        percentage,
        isDefaulter,
        neededFor75,
      };
    });

    return stats.sort((a, b) => a.percentage - b.percentage);
  },

  async getStudentPersonalSummary(studentId: string) {
    const enrolledSessions = state.sessions.filter(
      (s) => s.isLocked && s.records.some((r) => r.studentId === studentId)
    );

    let total = 0;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    const courseBreakdownMap = new Map<
      string,
      { total: number; attended: number; code: string; title: string }
    >();

    enrolledSessions.forEach((s) => {
      const rec = s.records.find((r) => r.studentId === studentId);
      if (!rec) return;

      total++;
      if (rec.status === 'PRESENT') present++;
      else if (rec.status === 'ABSENT') absent++;
      else if (rec.status === 'LATE') late++;
      else if (
        rec.status === 'EXCUSED' ||
        rec.status === 'MEDICAL_LEAVE' ||
        rec.status === 'ON_DUTY'
      )
        excused++;

      const isAttended = rec.status !== 'ABSENT';
      const c = state.courses.find((course) => course.id === s.courseId);
      const existing = courseBreakdownMap.get(s.courseId) || {
        total: 0,
        attended: 0,
        code: c?.code || s.courseId,
        title: c?.title || 'Course',
      };
      existing.total++;
      if (isAttended) existing.attended++;
      courseBreakdownMap.set(s.courseId, existing);
    });

    const overallPercentage =
      total > 0 ? Number((((present + late + excused) / total) * 100).toFixed(1)) : 100;

    const courses = Array.from(courseBreakdownMap.entries()).map(([courseId, val]) => ({
      courseId,
      code: val.code,
      title: val.title,
      total: val.total,
      attended: val.attended,
      percentage: Number(((val.attended / val.total) * 100).toFixed(1)),
      isDefaulter: Number(((val.attended / val.total) * 100).toFixed(1)) < 75.0,
    }));

    return {
      totalSessions: total,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      excusedCount: excused,
      overallPercentage,
      isCompliant: overallPercentage >= 75.0,
      courses,
      // Newest first: one row per locked lecture this student was on the roster for.
      history: enrolledSessions
        .map((s) => {
          const rec = s.records.find((r) => r.studentId === studentId)!;
          const c = state.courses.find((course) => course.id === s.courseId);
          return {
            sessionId: s.id,
            lectureDate: s.lectureDate,
            courseCode: c?.code || s.courseId,
            sessionNumber: s.sessionNumber,
            sessionTitle: s.sessionTitle,
            status: rec.status,
            remarks: rec.remarks,
          };
        })
        .sort((x, y) => y.lectureDate.localeCompare(x.lectureDate)),
    };
  },

  // --- Bulk Student Enrollment Import (CSV/Excel) ---
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
  }> {
    const section = state.sections.find((s) => s.id === sectionId);
    if (!section) throw new Error('Section not found');

    let duplicates = 0;
    let invalidRecords = 0;
    const existingEnrollments = new Set(
      section.enrolledStudents.map((s) => s.enrollmentNumber.trim().toUpperCase())
    );

    const newlyAdded: EnrolledStudent[] = [];

    importedList.forEach((item) => {
      const enroll = item.enrollmentNumber?.trim().toUpperCase();
      const name = item.fullName?.trim();
      const email = item.email?.trim();

      if (!enroll || !name) {
        invalidRecords++;
        return;
      }

      if (existingEnrollments.has(enroll)) {
        duplicates++;
        return;
      }

      existingEnrollments.add(enroll);
      const studentId = `stu-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newStudent: EnrolledStudent = {
        studentId,
        enrollmentNumber: enroll,
        fullName: name,
        email: email || `${enroll.toLowerCase()}@univ.edu`,
      };

      newlyAdded.push(newStudent);
      section.enrolledStudents.push(newStudent);
    });

    this.addSystemAudit({
      userId: actor.id,
      userName: actor.fullName,
      action: 'BULK_STUDENT_IMPORT',
      entityName: 'Section',
      entityId: sectionId,
      details: `Imported ${newlyAdded.length} students into ${section.name}. Duplicates: ${duplicates}, Invalid: ${invalidRecords}`,
    });

    return {
      totalReceived: importedList.length,
      successfullyImported: newlyAdded.length,
      duplicates,
      invalidRecords,
      records: section.enrolledStudents,
    };
  },

  // --- Audits & Logs ---
  async getSystemAuditLogs(): Promise<SystemAuditLog[]> {
    return state.systemAuditLogs;
  },

  addSystemAudit(entry: Omit<SystemAuditLog, 'id' | 'timestamp'>) {
    const log: SystemAuditLog = {
      id: `audit-log-${Date.now()}`,
      ...entry,
      timestamp: new Date().toISOString(),
    };
    state.systemAuditLogs.unshift(log);
  },

  // --- Helpers ---
  _calculateSummary(records: AttendanceRecord[]) {
    return {
      totalStudents: records.length,
      presentCount: records.filter((r) => r.status === 'PRESENT').length,
      absentCount: records.filter((r) => r.status === 'ABSENT').length,
      lateCount: records.filter((r) => r.status === 'LATE').length,
      excusedCount: records.filter((r) => r.status === 'EXCUSED').length,
      medicalLeaveCount: records.filter((r) => r.status === 'MEDICAL_LEAVE').length,
      onDutyCount: records.filter((r) => r.status === 'ON_DUTY').length,
    };
  },
};
