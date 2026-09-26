export type UserRole = 'STUDENT' | 'FACULTY' | 'HOD' | 'ADMIN_STAFF';

export type AttendanceStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'EXCUSED'
  | 'MEDICAL_LEAVE'
  | 'ON_DUTY';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeaveType = 'CASUAL' | 'MEDICAL' | 'ON_DUTY' | 'BEREAVEMENT';

export interface Campus {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  campusId: string;
  code: string;
  name: string;
  hodUserId?: string;
  isActive: boolean;
}

export interface Trimester {
  id: string;
  academicSession: string; // e.g. "2026-2027"
  name: string;            // e.g. "Trimester 2"
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  startDate: string;
  endDate: string;
}

export interface Course {
  id: string;
  campusId: string;
  departmentId: string;
  code: string;
  title: string;
  credits: number;
}

export interface EnrolledStudent {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  email: string;
}

export interface Section {
  id: string;
  campusId: string;
  departmentId: string;
  trimesterId: string;
  courseId: string;
  name: string;
  facultyId: string;
  enrolledStudents: EnrolledStudent[];
}

export interface User {
  id: string;
  ssoId: string;
  email: string;
  fullName: string;
  role: UserRole;
  campusId: string;
  departmentId?: string;
  isActive: boolean;
  password?: string;
  createdAt?: string;
  studentProfile?: {
    enrollmentNumber: string;
    academicYear: string;
    enrolledSections: string[];
  };
  facultyProfile?: {
    employeeCode: string;
    designation: string;
    assignedCourses: {
      courseId: string;
      sectionId: string;
    }[];
  };
}

export interface AttendanceRecord {
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  status: AttendanceStatus;
  remarks?: string;
  markedAt: string;
}

export interface SessionSummary {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  medicalLeaveCount: number;
  onDutyCount: number;
}

export interface LectureSession {
  id: string;
  campusId: string;
  departmentId: string;
  trimesterId: string;
  courseId: string;
  sectionId: string;
  facultyId: string;
  lectureDate: string; // YYYY-MM-DD
  sessionNumber: number;
  sessionTitle: string;
  isLocked: boolean;
  submittedAt?: string;
  submittedBy?: string;
  records: AttendanceRecord[];
  summary: SessionSummary;
}

export interface LeaveApplication {
  id: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  campusId: string;
  departmentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewComments?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AttendanceAudit {
  id: string;
  sessionId?: string;
  studentId: string;
  studentName: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  changedBy: string;
  changedByName: string;
  approvedBy?: string;
  createdAt: string;
}

export interface ComplianceThreshold {
  id: string;
  campusId?: string;
  departmentId?: string;
  courseId?: string;
  minPercentage: number;
  rules: {
    excusedCountsAsPresent: boolean;
    medicalCountsAsPresent: boolean;
    onDutyCountsAsPresent: boolean;
    lateWeightMultiplier: number;
  };
}

export interface SystemAuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityName: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface StudentComplianceStats {
  studentId: string;
  enrollmentNumber: string;
  fullName: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  totalLectures: number;
  attendedLectures: number;
  percentage: number;
  isDefaulter: boolean;
  neededFor75: number;
}
