import mongoose, { Schema, type Model } from 'mongoose';
import type {
  CalendarEvent,
  ExamSlot,
  AppNotification,
  Assessment,
  Assignment,
  Submission,
  AttendanceAudit,
  Campus,
  Course,
  Department,
  LeaveApplication,
  LectureSession,
  Section,
  SystemAuditLog,
  Trimester,
  User,
} from '@/types';

/** Stored shape of an app type: `id` lives in `_id`. */
export type Doc<T extends { id: string }> = Omit<T, 'id'> & { _id: string };

/*
 * MongoDB schemas. Every document uses a readable string `_id` (e.g.
 * "sec-ds-a", "user-faculty-1") that the app exposes as `id`, so API shapes,
 * URLs and seed data stay identical to the types in src/types.
 * Indexes enforce the rules the API relies on (see comments).
 */

const opts = { versionKey: false as const };
const str = { type: String, required: true };

const CampusSchema = new Schema(
  { _id: str, code: str, name: str, address: { type: String, default: '' }, isActive: { type: Boolean, default: true } },
  opts
);

const DepartmentSchema = new Schema(
  { _id: str, campusId: str, code: str, name: str, hodUserId: String, isActive: { type: Boolean, default: true } },
  opts
);

const TrimesterSchema = new Schema(
  { _id: str, academicSession: str, name: str, status: str, startDate: str, endDate: str },
  opts
);

const CourseSchema = new Schema(
  { _id: str, campusId: str, departmentId: str, code: str, title: str, credits: { type: Number, default: 0 } },
  opts
);

const EnrolledStudentSchema = new Schema(
  { studentId: str, enrollmentNumber: str, fullName: str, email: { type: String, default: '' } },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    _id: str,
    campusId: str,
    departmentId: str,
    trimesterId: str,
    courseId: str,
    name: str,
    facultyId: { ...str, index: true },
    kind: { type: String, enum: ['THEORY', 'LAB'], default: 'THEORY' },
    defaultPeriods: { type: Number, default: 1 },
    divisions: { type: [String], default: [] },
    batch: String,
    enrolledStudents: { type: [EnrolledStudentSchema], default: [] },
  },
  opts
);

const UserSchema = new Schema(
  {
    _id: str,
    ssoId: str,
    // Unique, stored lower-case by the service.
    email: { ...str, unique: true },
    fullName: str,
    role: { type: String, enum: ['STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF'], required: true },
    campusId: str,
    departmentId: String,
    isActive: { type: Boolean, default: true },
    password: String, // scrypt "salt:hash", never plaintext
    createdAt: String,
    studentProfile: {
      type: new Schema({ enrollmentNumber: str, academicYear: str, enrolledSections: [String] }, { _id: false }),
      default: undefined,
    },
    facultyProfile: {
      type: new Schema(
        {
          employeeCode: str,
          designation: str,
          assignedCourses: [new Schema({ courseId: str, sectionId: str }, { _id: false })],
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  opts
);

const AttendanceRecordSchema = new Schema(
  {
    studentId: str,
    enrollmentNumber: str,
    studentName: str,
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'MEDICAL_LEAVE', 'ON_DUTY'], required: true },
    remarks: String,
    markedAt: str,
  },
  { _id: false }
);

const LectureSessionSchema = new Schema(
  {
    _id: str,
    campusId: str,
    departmentId: str,
    trimesterId: str,
    courseId: str,
    sectionId: str,
    facultyId: str,
    lectureDate: str, // YYYY-MM-DD
    sessionNumber: { type: Number, required: true },
    sessionTitle: str,
    periods: { type: Number, default: 1, min: 1, max: 3 },
    isLocked: { type: Boolean, default: false },
    submittedAt: String,
    submittedBy: String,
    records: { type: [AttendanceRecordSchema], default: [] },
    summary: {
      totalStudents: Number,
      presentCount: Number,
      absentCount: Number,
      lateCount: Number,
      excusedCount: Number,
      medicalLeaveCount: Number,
      onDutyCount: Number,
    },
  },
  opts
);
// Lecture numbers are unique within a class.
LectureSessionSchema.index({ sectionId: 1, sessionNumber: 1 }, { unique: true });
// At most one open (unlocked) draft per class, even under concurrent requests.
LectureSessionSchema.index({ sectionId: 1 }, { unique: true, partialFilterExpression: { isLocked: false }, name: 'one_draft_per_class' });
LectureSessionSchema.index({ facultyId: 1, lectureDate: -1 });
LectureSessionSchema.index({ 'records.studentId': 1, isLocked: 1 });

const LeaveApplicationSchema = new Schema(
  {
    _id: str,
    studentId: { ...str, index: true },
    studentName: str,
    enrollmentNumber: str,
    campusId: str,
    departmentId: str,
    leaveType: { type: String, enum: ['CASUAL', 'MEDICAL', 'ON_DUTY', 'BEREAVEMENT'], required: true },
    startDate: str,
    endDate: str,
    reason: str,
    documentUrl: String,
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    reviewedBy: String,
    reviewComments: String,
    reviewedAt: String,
    createdAt: str,
  },
  opts
);
LeaveApplicationSchema.index({ departmentId: 1, status: 1 });

const AttendanceAuditSchema = new Schema(
  {
    _id: str,
    sessionId: str,
    studentId: str,
    studentName: str,
    previousStatus: str,
    newStatus: str,
    reason: str,
    changedBy: str,
    changedByName: str,
    createdAt: str,
  },
  opts
);

// Append-only: the service never updates or deletes these.
const SystemAuditLogSchema = new Schema(
  {
    _id: str,
    userId: str,
    userName: str,
    action: str,
    entityName: str,
    entityId: str,
    details: str,
    ipAddress: String,
    timestamp: { ...str, index: true },
  },
  opts
);

const NotificationSchema = new Schema(
  { _id: str, userId: str, title: str, body: str, tab: String, createdAt: str, readAt: String },
  opts
);
NotificationSchema.index({ userId: 1, createdAt: -1 });

const MarkEntrySchema = new Schema(
  {
    studentId: str,
    enrollmentNumber: str,
    studentName: str,
    marks: { type: Number, default: null },
    absent: { type: Boolean, default: false },
    remark: String,
  },
  { _id: false }
);

const AssessmentSchema = new Schema(
  {
    _id: str,
    sectionId: { ...str, index: true },
    courseId: str,
    departmentId: str,
    title: str,
    component: str,
    date: str,
    maxMarks: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'PUBLISHED'], default: 'DRAFT' },
    createdBy: str,
    createdAt: str,
    submittedAt: String,
    reviewedBy: String,
    reviewComment: String,
    publishedAt: String,
    entries: { type: [MarkEntrySchema], default: [] },
  },
  opts
);
AssessmentSchema.index({ departmentId: 1, status: 1 });
AssessmentSchema.index({ 'entries.studentId': 1, status: 1 });

const AssignmentSchema = new Schema(
  {
    _id: str,
    sectionId: { ...str, index: true },
    courseId: str,
    departmentId: str,
    title: str,
    instructions: { type: String, default: '' },
    dueAt: str,
    maxMarks: { type: Number, default: null },
    allowLate: { type: Boolean, default: true },
    attachments: { type: [String], default: [] },
    publishedBy: str,
    publishedAt: str,
  },
  opts
);
AssignmentSchema.index({ attachments: 1 });

const SubmissionSchema = new Schema(
  {
    _id: str,
    assignmentId: str,
    studentId: str,
    studentName: str,
    enrollmentNumber: str,
    text: String,
    files: { type: [String], default: [] },
    submittedAt: str,
    isLate: { type: Boolean, default: false },
    marks: { type: Number, default: null },
    feedback: String,
    gradedBy: String,
    gradedAt: String,
  },
  opts
);
// One submission per student per assignment (resubmitting replaces it).
SubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });
SubmissionSchema.index({ files: 1 });

const ExamSlotSchema = new Schema(
  {
    _id: str,
    courseId: str,
    divisions: { type: [String], default: [] },
    examType: str,
    date: str,
    start: str,
    end: str,
    room: { type: String, default: '' },
    note: String,
    createdBy: str,
    createdAt: str,
  },
  opts
);
ExamSlotSchema.index({ date: 1 });

const CalendarEventSchema = new Schema(
  {
    _id: str,
    title: str,
    kind: { type: String, enum: ['HOLIDAY', 'EVENT', 'DEADLINE'], required: true },
    date: str,
    endDate: String,
    audience: { type: String, enum: ['ALL', 'STUDENTS', 'STAFF'], default: 'ALL' },
    note: String,
    createdBy: str,
    createdAt: str,
  },
  opts
);
CalendarEventSchema.index({ date: 1 });

function model<T>(name: string, schema: Schema): Model<T> {
  // Reuse compiled models across Next.js hot reloads.
  return (mongoose.models[name] as Model<T>) || (mongoose.model(name, schema) as unknown as Model<T>);
}

export const CampusModel = model<Doc<Campus>>('Campus', CampusSchema);
export const DepartmentModel = model<Doc<Department>>('Department', DepartmentSchema);
export const TrimesterModel = model<Doc<Trimester>>('Trimester', TrimesterSchema);
export const CourseModel = model<Doc<Course>>('Course', CourseSchema);
export const SectionModel = model<Doc<Section>>('Section', SectionSchema);
export const UserModel = model<Doc<User>>('User', UserSchema);
export const LectureSessionModel = model<Doc<LectureSession>>('LectureSession', LectureSessionSchema);
export const LeaveApplicationModel = model<Doc<LeaveApplication>>('LeaveApplication', LeaveApplicationSchema);
export const AttendanceAuditModel = model<Doc<AttendanceAudit>>('AttendanceAudit', AttendanceAuditSchema);
export const SystemAuditLogModel = model<Doc<SystemAuditLog>>('SystemAuditLog', SystemAuditLogSchema);
export const NotificationModel = model<Doc<AppNotification>>('Notification', NotificationSchema);
export const AssessmentModel = model<Doc<Assessment>>('Assessment', AssessmentSchema);
export const AssignmentModel = model<Doc<Assignment>>('Assignment', AssignmentSchema);
export const SubmissionModel = model<Doc<Submission>>('Submission', SubmissionSchema);
export const ExamSlotModel = model<Doc<ExamSlot>>('ExamSlot', ExamSlotSchema);
export const CalendarEventModel = model<Doc<CalendarEvent>>('CalendarEvent', CalendarEventSchema);
