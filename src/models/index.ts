import mongoose, { Schema } from 'mongoose';

// 1. Campus & Department
const CampusSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    address: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DepartmentSchema = new Schema(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    code: { type: String, required: true, uppercase: true },
    name: { type: String, required: true },
    hodUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
DepartmentSchema.index({ campusId: 1, code: 1 }, { unique: true });

// 2. User (Polymorphic: Student, Faculty, HOD, Admin)
const UserSchema = new Schema(
  {
    ssoId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ['STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF'],
      required: true,
      index: true,
    },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    isActive: { type: Boolean, default: true },
    studentProfile: {
      enrollmentNumber: { type: String, sparse: true, index: true },
      academicYear: { type: String },
      enrolledSections: [{ type: Schema.Types.ObjectId, ref: 'Section' }],
    },
    facultyProfile: {
      employeeCode: { type: String, sparse: true },
      designation: { type: String },
      assignedCourses: [
        {
          courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
          sectionId: { type: Schema.Types.ObjectId, ref: 'Section' },
        },
      ],
    },
  },
  { timestamps: true }
);

// 3. Academic Structure
const TrimesterSchema = new Schema(
  {
    academicSession: { type: String, required: true },
    name: { type: String, required: true },
    status: {
      type: String,
      enum: ['UPCOMING', 'ACTIVE', 'COMPLETED'],
      default: 'UPCOMING',
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
  },
  { timestamps: true }
);

const CourseSchema = new Schema(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    code: { type: String, required: true, uppercase: true },
    title: { type: String, required: true },
    credits: { type: Number, default: 3 },
  },
  { timestamps: true }
);
CourseSchema.index({ campusId: 1, departmentId: 1, code: 1 }, { unique: true });

const SectionSchema = new Schema(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    trimesterId: { type: Schema.Types.ObjectId, ref: 'Trimester', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    name: { type: String, required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    enrolledStudents: [
      {
        studentId: { type: Schema.Types.ObjectId, ref: 'User' },
        enrollmentNumber: { type: String, required: true },
        fullName: { type: String, required: true },
        email: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// 4. Lecture Session & Embedded Attendance Records
const AttendanceItemSchema = new Schema(
  {
    studentId: { type: String, required: true },
    enrollmentNumber: { type: String, required: true },
    studentName: { type: String, required: true },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED', 'MEDICAL_LEAVE', 'ON_DUTY'],
      required: true,
    },
    remarks: { type: String },
    markedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const LectureSessionSchema = new Schema(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    trimesterId: { type: Schema.Types.ObjectId, ref: 'Trimester', required: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: 'Section', required: true },
    facultyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lectureDate: { type: String, required: true },
    sessionNumber: { type: Number, required: true },
    sessionTitle: { type: String, required: true },
    isLocked: { type: Boolean, default: false },
    submittedAt: { type: String },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    records: [AttendanceItemSchema],
    summary: {
      totalStudents: { type: Number, default: 0 },
      presentCount: { type: Number, default: 0 },
      absentCount: { type: Number, default: 0 },
      lateCount: { type: Number, default: 0 },
      excusedCount: { type: Number, default: 0 },
      medicalLeaveCount: { type: Number, default: 0 },
      onDutyCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// 5. Leave Application
const LeaveApplicationSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    enrollmentNumber: { type: String, required: true },
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus', required: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'MEDICAL', 'ON_DUTY', 'BEREAVEMENT'],
      required: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: { type: String, required: true },
    documentUrl: { type: String },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewComments: { type: String },
    reviewedAt: { type: String },
  },
  { timestamps: true }
);

// 6. Audits & Thresholds
const AttendanceAuditSchema = new Schema(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'LectureSession' },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    previousStatus: { type: String, required: true },
    newStatus: { type: String, required: true },
    reason: { type: String, required: true },
    changedBy: { type: String, required: true },
    changedByName: { type: String, required: true },
    approvedBy: { type: String },
  },
  { timestamps: true }
);

const SystemAuditLogSchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    entityName: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

const ComplianceThresholdSchema = new Schema(
  {
    campusId: { type: Schema.Types.ObjectId, ref: 'Campus' },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
    minPercentage: { type: Number, default: 75.0 },
    rules: {
      excusedCountsAsPresent: { type: Boolean, default: true },
      medicalCountsAsPresent: { type: Boolean, default: true },
      onDutyCountsAsPresent: { type: Boolean, default: true },
      lateWeightMultiplier: { type: Number, default: 1.0 },
    },
  },
  { timestamps: true }
);

// Exports with hot reload protection
export const CampusModel =
  mongoose.models.Campus || mongoose.model('Campus', CampusSchema);
export const DepartmentModel =
  mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
export const UserModel =
  mongoose.models.User || mongoose.model('User', UserSchema);
export const TrimesterModel =
  mongoose.models.Trimester || mongoose.model('Trimester', TrimesterSchema);
export const CourseModel =
  mongoose.models.Course || mongoose.model('Course', CourseSchema);
export const SectionModel =
  mongoose.models.Section || mongoose.model('Section', SectionSchema);
export const LectureSessionModel =
  mongoose.models.LectureSession ||
  mongoose.model('LectureSession', LectureSessionSchema);
export const LeaveApplicationModel =
  mongoose.models.LeaveApplication ||
  mongoose.model('LeaveApplication', LeaveApplicationSchema);
export const AttendanceAuditModel =
  mongoose.models.AttendanceAudit ||
  mongoose.model('AttendanceAudit', AttendanceAuditSchema);
export const SystemAuditLogModel =
  mongoose.models.SystemAuditLog ||
  mongoose.model('SystemAuditLog', SystemAuditLogSchema);
export const ComplianceThresholdModel =
  mongoose.models.ComplianceThreshold ||
  mongoose.model('ComplianceThreshold', ComplianceThresholdSchema);
