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
  /** THEORY = whole division; LAB = a batch (e.g. A1) taught in 2-period lab slots. */
  kind?: 'THEORY' | 'LAB';
  /** Periods a lecture of this class normally covers; pre-fills "Start lecture". */
  defaultPeriods?: number;
  /** Division(s) this class belongs to, e.g. ["5CEA"]; two for a combined class. */
  divisions?: string[];
  /** Lab batch within the division, e.g. "A1". */
  batch?: string;
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
  /** Timetable periods this lecture covered (a 2-hour lab = 2). Attendance % is weighted by it. */
  periods: number;
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
  /** Counted in timetable periods, not lectures (a 2-period lab adds 2). */
  totalPeriods: number;
  attendedPeriods: number;
  percentage: number;
  isDefaulter: boolean;
  neededFor75: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  /** Portal tab to open when clicked, e.g. "student-marks". */
  tab?: string;
  createdAt: string;
  readAt?: string;
}

export type FilePurpose = 'LEAVE_PROOF' | 'ASSIGNMENT' | 'SUBMISSION';

export interface StoredFile {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  ownerId: string;
  purpose: FilePurpose;
  uploadedAt: string;
}

export type AssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED';

export interface MarkEntry {
  studentId: string;
  enrollmentNumber: string;
  studentName: string;
  /** null = not entered yet. */
  marks: number | null;
  absent: boolean;
  remark?: string;
}

/** One exam, test or viva for one class, with every student's marks. */
export interface Assessment {
  id: string;
  sectionId: string;
  courseId: string;
  departmentId: string;
  title: string;
  /** Free label, e.g. "Mid-semester exam", "Viva". */
  component: string;
  date: string; // YYYY-MM-DD
  maxMarks: number;
  status: AssessmentStatus;
  createdBy: string;
  createdAt: string;
  submittedAt?: string;
  reviewedBy?: string;
  /** HOD's note when returning marks for changes. */
  reviewComment?: string;
  publishedAt?: string;
  entries: MarkEntry[];
}

/** Homework published by a teacher for one class. */
export interface Assignment {
  id: string;
  sectionId: string;
  courseId: string;
  departmentId: string;
  title: string;
  instructions: string;
  /** Deadline, ISO date-time. */
  dueAt: string;
  /** Optional; ungraded assignments have none. */
  maxMarks: number | null;
  allowLate: boolean;
  /** Uploaded file ids (purpose ASSIGNMENT). */
  attachments: string[];
  publishedBy: string;
  publishedAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  text?: string;
  /** Uploaded file ids (purpose SUBMISSION). */
  files: string[];
  submittedAt: string;
  isLate: boolean;
  marks?: number | null;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export type ExamType = 'MID_SEM' | 'UNIT_TEST' | 'PRACTICAL' | 'VIVA' | 'GTU_EXTERNAL' | 'OTHER';

/** One exam sitting for one subject and one or more divisions. */
export interface ExamSlot {
  id: string;
  courseId: string;
  divisions: string[];
  examType: ExamType;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM, India time
  end: string; // HH:MM
  room: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type EventKind = 'HOLIDAY' | 'EVENT' | 'DEADLINE';

/** Academic calendar entry. Holidays block starting lectures on those days. */
export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  date: string;
  endDate?: string;
  audience: 'ALL' | 'STUDENTS' | 'STAFF';
  note?: string;
  createdBy: string;
  createdAt: string;
}

/** A fee the office publishes for a group of students. Amounts are in paise (₹1 = 100). */
export interface Fee {
  id: string;
  title: string;
  amount: number;
  /** Department it applies to; absent = every department. */
  departmentId?: string;
  /** Student academic year it applies to (e.g. "2026-2027"); absent = every year. */
  academicYear?: string;
  dueDate: string; // YYYY-MM-DD
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type PaymentGatewayId = 'razorpay' | 'cashfree' | 'payu' | 'paytm' | 'stripe' | 'paypal';

/**
 * One attempt by a student to pay one fee through one gateway. Only one
 * attempt per student and fee can be PAID; a second success elsewhere is
 * marked DUPLICATE so the office can refund it. The receipt is printed from
 * the snapshot fields, so it stays the same even if the fee, the student's
 * name or the college details change later.
 */
export interface FeePayment {
  id: string;
  feeId: string;
  studentId: string;
  status: 'CREATED' | 'PAID' | 'FAILED' | 'DUPLICATE';
  gateway: PaymentGatewayId;
  /** The gateway's id for this checkout (order, session or transaction id). */
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  method?: string; // card, upi, netbanking, wallet…
  amount: number; // the fee, in paise
  currency: 'INR';
  /** Set when the gateway charges another currency (PayPal: USD cents). */
  chargedAmount?: number;
  chargedCurrency?: string;
  /** Rupees per unit of chargedCurrency used for the conversion. */
  exchangeRate?: number;
  receiptNumber?: string;
  paidAt?: string;
  createdAt: string;
  feeTitle: string;
  academicYear?: string;
  collegeName: string;
  departmentName?: string;
  studentName: string;
  enrollmentNumber: string;
  studentEmail: string;
}
