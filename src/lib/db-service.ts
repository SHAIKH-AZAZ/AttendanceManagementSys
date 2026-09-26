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

// Reactive in-memory state (resilient fallback when MongoDB connection is establishing or offline)
class DatabaseState {
  campuses: Campus[] = [...INITIAL_CAMPUSES];
  departments: Department[] = [...INITIAL_DEPARTMENTS];
  trimesters: Trimester[] = [...INITIAL_TRIMESTERS];
  courses: Course[] = [...INITIAL_COURSES];
  sections: Section[] = [...INITIAL_SECTIONS];
  users: User[] = [...INITIAL_USERS];
  sessions: LectureSession[] = JSON.parse(JSON.stringify(INITIAL_SESSIONS));
  leaves: LeaveApplication[] = JSON.parse(JSON.stringify(INITIAL_LEAVES));
  audits: AttendanceAudit[] = [];
  systemAuditLogs: SystemAuditLog[] = [...INITIAL_AUDIT_LOGS];
  thresholds: ComplianceThreshold[] = [...INITIAL_THRESHOLDS];
}

// Global persistence across Next.js dev server hot-reloads
declare global {
  // eslint-disable-next-line no-var
  var __attendease_db_state: DatabaseState | undefined;
}

const state: DatabaseState =
  global.__attendease_db_state || new DatabaseState();

if (!global.__attendease_db_state) {
  global.__attendease_db_state = state;
}

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
  ): Promise<{ user: User; token: string }> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('This user account has been deactivated. Please contact your administrator.');
    }

    // Check password if set on user
    if (user.password && password && user.password !== password) {
      throw new Error('Invalid email or password.');
    }

    // Generate mock signed bearer session token
    const token = `att_jwt_${user.id}_${Date.now()}`;

    this.addSystemAudit({
      userId: user.id,
      userName: user.fullName,
      action: 'USER_LOGIN',
      entityName: 'User',
      entityId: user.id,
      details: `${user.fullName} (${user.role}) logged in successfully.`,
    });

    return { user, token };
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
  }): Promise<User> {
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
      password: data.password || 'welcome123',
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
      userId: 'user-admin-1',
      userName: 'Administrator',
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: newUser.id,
      details: `Created new user ${newUser.fullName} (${newUser.role}, ${newUser.email})`,
    });

    return newUser;
  },

  async updateUser(
    id: string,
    updates: Partial<Omit<User, 'id'>>
  ): Promise<User> {
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found.');

    Object.assign(user, updates);

    this.addSystemAudit({
      userId: 'user-admin-1',
      userName: 'Administrator',
      action: 'USER_UPDATED',
      entityName: 'User',
      entityId: user.id,
      details: `Updated details for ${user.fullName} (${user.email})`,
    });

    return user;
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const user = state.users.find((u) => u.id === id);
    if (!user) throw new Error('User not found.');

    user.isActive = false; // Soft deactivate

    this.addSystemAudit({
      userId: 'user-admin-1',
      userName: 'Administrator',
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

    session.records = records;
    session.summary = this._calculateSummary(records);
    return session;
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

    session.records = records;
    session.summary = this._calculateSummary(records);
    session.isLocked = true;
    session.submittedAt = new Date().toISOString();
    session.submittedBy = facultyId;

    // Log to system audit
    this.addSystemAudit({
      userId: facultyId,
      userName: 'Faculty Submitter',
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

    // Apply copied statuses into current session records
    currentSession.records = currentSession.records.map((r) => ({
      ...r,
      status: prevMap.get(r.studentId) || 'PRESENT',
    }));

    currentSession.summary = this._calculateSummary(currentSession.records);
    return currentSession.records;
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
          if (rec) {
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
              changedByName: 'HOD Department Approver',
              createdAt: new Date().toISOString(),
            });
          }
        }
      });
    }

    this.addSystemAudit({
      userId: hodUserId,
      userName: 'HOD Reviewer',
      action: `LEAVE_${status}`,
      entityName: 'LeaveApplication',
      entityId: leave.id,
      details: `Leave application #${leave.id} was ${status}. ${updatedSessionCount} lecture records updated.`,
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
    };
  },

  // --- Bulk Student Enrollment Import (CSV/Excel) ---
  async importStudentsRoster(
    sectionId: string,
    importedList: { enrollmentNumber: string; fullName: string; email: string }[]
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
      userId: 'user-admin-1',
      userName: 'Admin Staff',
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
