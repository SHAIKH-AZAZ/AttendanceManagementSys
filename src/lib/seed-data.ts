import {
  Campus,
  Department,
  Trimester,
  Course,
  Section,
  User,
  LectureSession,
  LeaveApplication,
  SystemAuditLog,
  ComplianceThreshold,
} from '@/types';

export const INITIAL_CAMPUSES: Campus[] = [
  {
    id: 'campus-1',
    code: 'NORTH',
    name: 'North Campus (Engineering & Tech)',
    address: 'University Road, North Zone',
    isActive: true,
  },
  {
    id: 'campus-2',
    code: 'SOUTH',
    name: 'South Campus (Sciences & Research)',
    address: 'Innovation Boulevard, South Zone',
    isActive: true,
  },
  {
    id: 'campus-3',
    code: 'CITY',
    name: 'City Campus (Executive & Postgrad)',
    address: 'Central Plaza, Metro Center',
    isActive: true,
  },
];

export const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-cs',
    campusId: 'campus-1',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    hodUserId: 'user-hod-1',
    isActive: true,
  },
  {
    id: 'dept-it',
    campusId: 'campus-1',
    code: 'IT',
    name: 'Information Technology',
    isActive: true,
  },
  {
    id: 'dept-ec',
    campusId: 'campus-1',
    code: 'ECE',
    name: 'Electronics & Communication',
    isActive: true,
  },
  {
    id: 'dept-civil',
    campusId: 'campus-2',
    code: 'CIVIL',
    name: 'Civil Engineering',
    isActive: true,
  },
];

export const INITIAL_TRIMESTERS: Trimester[] = [
  {
    id: 'tri-2026-t2',
    academicSession: '2026-2027',
    name: 'Trimester 2 (Spring 2026)',
    status: 'ACTIVE',
    startDate: '2026-01-05',
    endDate: '2026-05-15',
  },
  {
    id: 'tri-2026-t1',
    academicSession: '2026-2027',
    name: 'Trimester 1 (Fall 2025)',
    status: 'COMPLETED',
    startDate: '2025-08-01',
    endDate: '2025-12-15',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-ds',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    code: 'CS-301',
    title: 'Data Structures & Algorithms',
    credits: 4,
  },
  {
    id: 'course-dbms',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    code: 'CS-302',
    title: 'Database Management Systems',
    credits: 4,
  },
  {
    id: 'course-os',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    code: 'CS-303',
    title: 'Operating Systems Architecture',
    credits: 3,
  },
  {
    id: 'course-cn',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    code: 'CS-304',
    title: 'Computer Networks & Security',
    credits: 3,
  },
];

export const ROSTER_STUDENTS = [
  { studentId: 'stu-1', enrollmentNumber: 'CS-2026-001', fullName: 'Aarav Patel', email: 'aarav.patel@univ.edu' },
  { studentId: 'stu-2', enrollmentNumber: 'CS-2026-002', fullName: 'Aisha Khan', email: 'aisha.khan@univ.edu' },
  { studentId: 'stu-3', enrollmentNumber: 'CS-2026-003', fullName: 'Ananya Verma', email: 'ananya.verma@univ.edu' }, // Defaulter
  { studentId: 'stu-4', enrollmentNumber: 'CS-2026-004', fullName: 'Devendra Joshi', email: 'devendra.joshi@univ.edu' }, // Borderline
  { studentId: 'stu-5', enrollmentNumber: 'CS-2026-005', fullName: 'Rohan Gupta', email: 'rohan.gupta@univ.edu' },
  { studentId: 'stu-6', enrollmentNumber: 'CS-2026-006', fullName: 'Priya Nair', email: 'priya.nair@univ.edu' },
  { studentId: 'stu-7', enrollmentNumber: 'CS-2026-007', fullName: 'Sneha Iyer', email: 'sneha.iyer@univ.edu' },
  { studentId: 'stu-8', enrollmentNumber: 'CS-2026-008', fullName: 'Kunal Deshmukh', email: 'kunal.deshmukh@univ.edu' },
  { studentId: 'stu-9', enrollmentNumber: 'CS-2026-009', fullName: 'Tanvi Joshi', email: 'tanvi.joshi@univ.edu' }, // Defaulter
  { studentId: 'stu-10', enrollmentNumber: 'CS-2026-010', fullName: 'Vikram Singh', email: 'vikram.singh@univ.edu' },
  { studentId: 'stu-11', enrollmentNumber: 'CS-2026-011', fullName: 'Meera Sen', email: 'meera.sen@univ.edu' },
  { studentId: 'stu-12', enrollmentNumber: 'CS-2026-012', fullName: 'Arjun Reddy', email: 'arjun.reddy@univ.edu' },
  { studentId: 'stu-13', enrollmentNumber: 'CS-2026-013', fullName: 'Pooja Mehra', email: 'pooja.mehra@univ.edu' },
  { studentId: 'stu-14', enrollmentNumber: 'CS-2026-014', fullName: 'Siddharth Malhotra', email: 'siddharth.m@univ.edu' },
  { studentId: 'stu-15', enrollmentNumber: 'CS-2026-015', fullName: 'Divya Sharma', email: 'divya.sharma@univ.edu' },
];

export const INITIAL_SECTIONS: Section[] = [
  {
    id: 'sec-ds-a',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    trimesterId: 'tri-2026-t2',
    courseId: 'course-ds',
    name: 'Section A (Computer-A)',
    facultyId: 'user-faculty-1',
    enrolledStudents: ROSTER_STUDENTS,
  },
  {
    id: 'sec-ds-b',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    trimesterId: 'tri-2026-t2',
    courseId: 'course-ds',
    name: 'Section B (Computer-B)',
    facultyId: 'user-faculty-1',
    enrolledStudents: ROSTER_STUDENTS.slice(0, 10),
  },
  {
    id: 'sec-dbms-a',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    trimesterId: 'tri-2026-t2',
    courseId: 'course-dbms',
    name: 'Section A (Computer-A)',
    facultyId: 'user-faculty-2',
    enrolledStudents: ROSTER_STUDENTS,
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-faculty-1',
    ssoId: 'sso_faculty_rajesh',
    email: 'rajesh.sharma@univ.edu',
    fullName: 'Prof. Rajesh Sharma',
    role: 'FACULTY',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'faculty123',
    createdAt: '2026-01-10T09:00:00Z',
    facultyProfile: {
      employeeCode: 'FAC-CSE-102',
      designation: 'Associate Professor & Course Lead',
      assignedCourses: [
        { courseId: 'course-ds', sectionId: 'sec-ds-a' },
        { courseId: 'course-ds', sectionId: 'sec-ds-b' },
      ],
    },
  },
  {
    id: 'user-faculty-2',
    ssoId: 'sso_faculty_anita',
    email: 'anita.desai@univ.edu',
    fullName: 'Dr. Anita Desai',
    role: 'FACULTY',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'faculty123',
    createdAt: '2026-01-10T09:00:00Z',
    facultyProfile: {
      employeeCode: 'FAC-CSE-108',
      designation: 'Assistant Professor',
      assignedCourses: [{ courseId: 'course-dbms', sectionId: 'sec-dbms-a' }],
    },
  },
  {
    id: 'user-hod-1',
    ssoId: 'sso_hod_sunita',
    email: 'sunita.rao@univ.edu',
    fullName: 'Dr. Sunita Rao',
    role: 'HOD',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'hod123',
    createdAt: '2026-01-05T09:00:00Z',
  },
  {
    id: 'user-admin-1',
    ssoId: 'sso_admin_arun',
    email: 'arun.kulkarni@univ.edu',
    fullName: 'Arun Kulkarni',
    role: 'ADMIN_STAFF',
    campusId: 'campus-1',
    isActive: true,
    password: 'admin123',
    createdAt: '2026-01-01T09:00:00Z',
  },
  {
    id: 'stu-4',
    ssoId: 'sso_stu_devendra',
    email: 'devendra.joshi@univ.edu',
    fullName: 'Devendra Joshi',
    role: 'STUDENT',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'student123',
    createdAt: '2026-01-15T09:00:00Z',
    studentProfile: {
      enrollmentNumber: 'CS-2026-004',
      academicYear: '2026-2027',
      enrolledSections: ['sec-ds-a', 'sec-dbms-a'],
    },
  },
  {
    id: 'stu-1',
    ssoId: 'sso_stu_aarav',
    email: 'aarav.patel@univ.edu',
    fullName: 'Aarav Patel',
    role: 'STUDENT',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'student123',
    createdAt: '2026-01-15T09:00:00Z',
    studentProfile: {
      enrollmentNumber: 'CS-2026-001',
      academicYear: '2026-2027',
      enrolledSections: ['sec-ds-a', 'sec-dbms-a'],
    },
  },
  {
    id: 'stu-3',
    ssoId: 'sso_stu_ananya',
    email: 'ananya.verma@univ.edu',
    fullName: 'Ananya Verma',
    role: 'STUDENT',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    isActive: true,
    password: 'student123',
    createdAt: '2026-01-15T09:00:00Z',
    studentProfile: {
      enrollmentNumber: 'CS-2026-003',
      academicYear: '2026-2027',
      enrolledSections: ['sec-ds-a', 'sec-dbms-a'],
    },
  },
];

// Helper to generate realistic historical sessions
function generateHistoricalSessions(): LectureSession[] {
  const sessions: LectureSession[] = [];
  const baseDate = new Date('2026-02-01');

  for (let i = 1; i <= 24; i++) {
    const lectureDate = new Date(baseDate);
    lectureDate.setDate(baseDate.getDate() + (i - 1) * 3);
    const dateStr = lectureDate.toISOString().split('T')[0];

    const records = ROSTER_STUDENTS.map((stu) => {
      // Deterministic attendance per student for testing 75% rule
      let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' = 'PRESENT';

      if (stu.enrollmentNumber === 'CS-2026-003') {
        // Ananya Verma: Absent on many sessions (defaulter ~66%)
        status = i % 3 === 0 ? 'ABSENT' : 'PRESENT';
      } else if (stu.enrollmentNumber === 'CS-2026-004') {
        // Devendra Joshi: Borderline (70.8%)
        status = i % 4 === 0 || i === 22 || i === 23 ? 'ABSENT' : 'PRESENT';
      } else if (stu.enrollmentNumber === 'CS-2026-009') {
        // Tanvi Joshi: Defaulter (~62%)
        status = i % 3 === 1 ? 'ABSENT' : 'PRESENT';
      } else {
        // Others mostly present with occasional late or absent
        if (i === 5 && stu.enrollmentNumber === 'CS-2026-001') status = 'LATE';
        else if (i === 12 && stu.enrollmentNumber === 'CS-2026-006') status = 'ABSENT';
        else status = 'PRESENT';
      }

      const record: import('@/types').AttendanceRecord = {
        studentId: stu.studentId,
        enrollmentNumber: stu.enrollmentNumber,
        studentName: stu.fullName,
        status: status as import('@/types').AttendanceStatus,
        markedAt: `${dateStr}T10:55:00Z`,
      };
      return record;
    });

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const lateCount = records.filter((r) => r.status === 'LATE').length;
    const excusedCount = records.filter((r) => (r.status as string) === 'EXCUSED').length;

    sessions.push({
      id: `session-ds-${i}`,
      campusId: 'campus-1',
      departmentId: 'dept-cs',
      trimesterId: 'tri-2026-t2',
      courseId: 'course-ds',
      sectionId: 'sec-ds-a',
      facultyId: 'user-faculty-1',
      lectureDate: dateStr,
      sessionNumber: i,
      sessionTitle: `Lecture ${i}: Data Structures Core Topic #${i}`,
      isLocked: true,
      submittedAt: `${dateStr}T11:00:00Z`,
      submittedBy: 'user-faculty-1',
      records,
      summary: {
        totalStudents: 15,
        presentCount,
        absentCount,
        lateCount,
        excusedCount,
        medicalLeaveCount: 0,
        onDutyCount: 0,
      },
    });
  }

  // Add Today's Pending Lecture (Session #25) - NOT LOCKED
  const todayStr = '2026-09-26';
  const draftRecords = ROSTER_STUDENTS.map((stu) => ({
    studentId: stu.studentId,
    enrollmentNumber: stu.enrollmentNumber,
    studentName: stu.fullName,
    status: 'PRESENT' as const,
    markedAt: `${todayStr}T10:00:00Z`,
  }));

  sessions.push({
    id: 'session-ds-today',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    trimesterId: 'tri-2026-t2',
    courseId: 'course-ds',
    sectionId: 'sec-ds-a',
    facultyId: 'user-faculty-1',
    lectureDate: todayStr,
    sessionNumber: 25,
    sessionTitle: 'Lecture 25: Balanced Binary Search Trees & AVL Rotations',
    isLocked: false,
    records: draftRecords,
    summary: {
      totalStudents: 15,
      presentCount: 15,
      absentCount: 0,
      lateCount: 0,
      excusedCount: 0,
      medicalLeaveCount: 0,
      onDutyCount: 0,
    },
  });

  return sessions;
}

export const INITIAL_SESSIONS: LectureSession[] = generateHistoricalSessions();

export const INITIAL_LEAVES: LeaveApplication[] = [
  {
    id: 'leave-1',
    studentId: 'stu-4',
    studentName: 'Devendra Joshi',
    enrollmentNumber: 'CS-2026-004',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    leaveType: 'MEDICAL',
    startDate: '2026-09-20',
    endDate: '2026-09-22',
    reason: 'Admitted to City Medical Center due to acute viral infection with platelet drop.',
    documentUrl: '/uploads/medical_cert_devendra.pdf',
    status: 'PENDING',
    createdAt: '2026-09-21T09:30:00Z',
  },
  {
    id: 'leave-2',
    studentId: 'stu-3',
    studentName: 'Ananya Verma',
    enrollmentNumber: 'CS-2026-003',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    leaveType: 'ON_DUTY',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    reason: 'Official University representation at ACM ICPC Regional Programming Contest.',
    documentUrl: '/uploads/icpc_participation_letter.pdf',
    status: 'APPROVED',
    reviewedBy: 'user-hod-1',
    reviewComments: 'Approved on duty representation. Dean office certified.',
    reviewedAt: '2026-09-13T14:20:00Z',
    createdAt: '2026-09-08T11:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'audit-1',
    userId: 'user-admin-1',
    userName: 'Arun Kulkarni (Admin)',
    action: 'SYSTEM_CONFIG_UPDATED',
    entityName: 'Campus',
    entityId: 'campus-1',
    details: 'Configured North Campus academic term parameters for Trimester 2',
    timestamp: '2026-09-26T08:00:00Z',
  },
  {
    id: 'audit-2',
    userId: 'user-faculty-1',
    userName: 'Prof. Rajesh Sharma',
    action: 'ATTENDANCE_SUBMITTED',
    entityName: 'LectureSession',
    entityId: 'session-ds-24',
    details: 'Submitted and locked Lecture #24: Graph Shortest Paths (Dijkstra)',
    timestamp: '2026-09-25T11:05:00Z',
  },
  {
    id: 'audit-3',
    userId: 'user-hod-1',
    userName: 'Dr. Sunita Rao (HOD)',
    action: 'LEAVE_APPROVED_EXCUSED',
    entityName: 'LeaveApplication',
    entityId: 'leave-2',
    details: 'Approved On-Duty leave for Ananya Verma (CS-2026-003), excused 2 sessions',
    timestamp: '2026-09-13T14:20:00Z',
  },
];

export const INITIAL_THRESHOLDS: ComplianceThreshold[] = [
  {
    id: 'thresh-cse',
    campusId: 'campus-1',
    departmentId: 'dept-cs',
    minPercentage: 75.0,
    rules: {
      excusedCountsAsPresent: true,
      medicalCountsAsPresent: true,
      onDutyCountsAsPresent: true,
      lateWeightMultiplier: 1.0,
    },
  },
  {
    id: 'thresh-it',
    campusId: 'campus-1',
    departmentId: 'dept-it',
    minPercentage: 75.0,
    rules: {
      excusedCountsAsPresent: true,
      medicalCountsAsPresent: true,
      onDutyCountsAsPresent: true,
      lateWeightMultiplier: 1.0,
    },
  },
];
