import { randomBytes } from 'node:crypto';
import type { Assignment, FilePurpose, Section, Submission, User } from '@/types';
import { AssignmentModel, CourseModel, SectionModel, SubmissionModel } from '@/models';
import { connectToDatabase } from '../mongodb';
import { dbService } from '../db-service';
import { notify } from './notifications';
import { deleteFile, getFileMeta } from './files';

/*
 * Assignments: a teacher publishes one for a class; enrolled students submit
 * (text and/or files) until the deadline, or late if allowed; the teacher
 * grades. One submission per student; resubmitting replaces it until graded.
 */

export class AssignmentError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const out = <T>(d: any): T => {
  const { _id, ...rest } = d;
  return { id: _id, ...rest } as T;
};

async function sectionOf(id: string): Promise<Section> {
  const s = await SectionModel.findById(id).lean();
  if (!s) throw new AssignmentError('Class not found.', 404);
  return out<Section>(s);
}

const isEnrolled = (section: Section, userId: string) => section.enrolledStudents.some((s) => s.studentId === userId);

/** Teacher of the class, HOD of its department, admin, or (for reading) an enrolled student. */
function access(user: User, section: Section) {
  const staff =
    user.role === 'ADMIN_STAFF' ||
    (user.role === 'HOD' && section.departmentId === user.departmentId) ||
    section.facultyId === user.id;
  return { staff, teacher: section.facultyId === user.id, student: user.role === 'STUDENT' && isEnrolled(section, user.id) };
}

/** Files must have been uploaded by this user for this purpose. */
async function checkFiles(ids: unknown, ownerId: string, purpose: FilePurpose): Promise<string[]> {
  if (ids === undefined) return [];
  if (!Array.isArray(ids) || ids.length > 5 || ids.some((x) => typeof x !== 'string')) {
    throw new AssignmentError('Attach at most 5 files.');
  }
  for (const id of ids as string[]) {
    const meta = await getFileMeta(id);
    if (!meta || meta.ownerId !== ownerId || meta.purpose !== purpose) {
      throw new AssignmentError('One of the attached files was not found. Upload it again.');
    }
  }
  return [...new Set(ids as string[])];
}

async function label(a: Assignment) {
  const c = await CourseModel.findById(a.courseId, { code: 1 }).lean();
  return `${c?.code ?? ''} · ${a.title}`;
}

export async function createAssignment(
  user: User,
  body: { sectionId: string; title: string; instructions?: string; dueAt: string; maxMarks?: number | null; allowLate?: boolean; attachments?: unknown }
) {
  await connectToDatabase();
  const section = await sectionOf(body.sectionId);
  if (section.facultyId !== user.id) throw new AssignmentError('You do not teach this class.', 403);
  const due = new Date(body.dueAt);
  if (Number.isNaN(due.getTime())) throw new AssignmentError('Enter a valid due date and time.');
  if (due.getTime() < Date.now()) throw new AssignmentError('The due date must be in the future.');

  const a: Assignment = {
    id: newId('asg'),
    sectionId: section.id,
    courseId: section.courseId,
    departmentId: section.departmentId,
    title: body.title.trim(),
    instructions: (body.instructions ?? '').trim(),
    dueAt: due.toISOString(),
    maxMarks: body.maxMarks ?? null,
    allowLate: body.allowLate !== false,
    attachments: await checkFiles(body.attachments, user.id, 'ASSIGNMENT'),
    publishedBy: user.id,
    publishedAt: new Date().toISOString(),
  };
  const { id: _id, ...rest } = a;
  await AssignmentModel.create({ _id, ...rest });

  const name = await label(a);
  await dbService.addSystemAudit({
    userId: user.id,
    userName: user.fullName,
    action: 'ASSIGNMENT_PUBLISHED',
    entityName: 'Assignment',
    entityId: a.id,
    details: `${name} for ${section.name}, due ${a.dueAt}`,
  });
  await notify(
    section.enrolledStudents.map((s) => s.studentId),
    { title: 'New assignment', body: `${name} · due ${new Date(a.dueAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`, tab: 'student-assignments' }
  );
  return a;
}

/** Assignments the user may see, with submission counts (staff) or their own submission (students). */
export async function listAssignments(user: User, sectionId?: string) {
  await connectToDatabase();
  let sectionIds: string[];
  if (user.role === 'STUDENT') {
    const mine = await SectionModel.find({ 'enrolledStudents.studentId': user.id }, { _id: 1 }).lean();
    sectionIds = mine.map((s) => s._id);
  } else if (user.role === 'FACULTY') {
    sectionIds = (await SectionModel.find({ facultyId: user.id }, { _id: 1 }).lean()).map((s) => s._id);
  } else if (user.role === 'HOD') {
    sectionIds = (await SectionModel.find({ departmentId: user.departmentId }, { _id: 1 }).lean()).map((s) => s._id);
  } else {
    sectionIds = (await SectionModel.find({}, { _id: 1 }).lean()).map((s) => s._id);
  }
  if (sectionId) sectionIds = sectionIds.filter((s) => s === sectionId);

  const assignments = (await AssignmentModel.find({ sectionId: { $in: sectionIds } }).sort({ dueAt: -1 }).lean()).map((d) => out<Assignment>(d));
  const ids = assignments.map((a) => a.id);

  if (user.role === 'STUDENT') {
    const subs = await SubmissionModel.find({ assignmentId: { $in: ids }, studentId: user.id }).lean();
    const byA = new Map(subs.map((s) => [s.assignmentId, out<Submission>(s)]));
    return assignments.map((a) => ({ ...a, submission: byA.get(a.id) ?? null }));
  }

  const sections = new Map((await SectionModel.find({ _id: { $in: sectionIds } }, { enrolledStudents: 1 }).lean()).map((s) => [s._id, s.enrolledStudents.length]));
  const subs = await SubmissionModel.find({ assignmentId: { $in: ids } }, { assignmentId: 1, isLate: 1, gradedAt: 1 }).lean();
  return assignments.map((a) => {
    const mine = subs.filter((s) => s.assignmentId === a.id);
    return {
      ...a,
      counts: {
        students: sections.get(a.sectionId) ?? 0,
        submitted: mine.length,
        late: mine.filter((s) => s.isLate).length,
        graded: mine.filter((s) => s.gradedAt).length,
      },
    };
  });
}

/** One assignment. Staff get every student's status; students get their own submission. */
export async function getAssignment(user: User, id: string) {
  await connectToDatabase();
  const doc = await AssignmentModel.findById(id).lean();
  if (!doc) throw new AssignmentError('Assignment not found.', 404);
  const a = out<Assignment>(doc);
  const section = await sectionOf(a.sectionId);
  const acc = access(user, section);
  if (!acc.staff && !acc.student) throw new AssignmentError('Assignment not found.', 404);

  const attachments = (await Promise.all(a.attachments.map((f) => getFileMeta(f)))).filter(Boolean);
  if (acc.student) {
    const s = await SubmissionModel.findOne({ assignmentId: id, studentId: user.id }).lean();
    const submission = s ? out<Submission>(s) : null;
    const files = submission ? (await Promise.all(submission.files.map((f) => getFileMeta(f)))).filter(Boolean) : [];
    return { assignment: a, attachments, submission, submissionFiles: files, canSubmit: !submission?.gradedAt && (a.allowLate || Date.now() <= Date.parse(a.dueAt)) };
  }

  const subs = (await SubmissionModel.find({ assignmentId: id }).lean()).map((s) => out<Submission>(s));
  const metas = new Map((await Promise.all(subs.flatMap((s) => s.files).map((f) => getFileMeta(f)))).filter(Boolean).map((m) => [m!.id, m!]));
  const roster = section.enrolledStudents.map((st) => {
    const sub = subs.find((s) => s.studentId === st.studentId) ?? null;
    return {
      studentId: st.studentId,
      studentName: st.fullName,
      enrollmentNumber: st.enrollmentNumber,
      submission: sub ? { ...sub, fileMeta: sub.files.map((f) => metas.get(f)).filter(Boolean) } : null,
    };
  });
  return { assignment: a, attachments, roster, canGrade: acc.teacher };
}

export async function updateAssignment(user: User, id: string, body: { dueAt?: string; allowLate?: boolean }) {
  await connectToDatabase();
  const a = await AssignmentModel.findById(id).lean();
  if (!a) throw new AssignmentError('Assignment not found.', 404);
  const section = await sectionOf(a.sectionId);
  if (section.facultyId !== user.id) throw new AssignmentError('Only the class teacher can change this.', 403);
  const set: Record<string, unknown> = {};
  if (body.dueAt !== undefined) {
    const due = new Date(body.dueAt);
    if (Number.isNaN(due.getTime())) throw new AssignmentError('Enter a valid due date and time.');
    set.dueAt = due.toISOString();
  }
  if (typeof body.allowLate === 'boolean') set.allowLate = body.allowLate;
  const updated = await AssignmentModel.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
  return out<Assignment>(updated);
}

export async function deleteAssignment(user: User, id: string) {
  await connectToDatabase();
  const a = await AssignmentModel.findById(id).lean();
  if (!a) throw new AssignmentError('Assignment not found.', 404);
  const section = await sectionOf(a.sectionId);
  if (section.facultyId !== user.id) throw new AssignmentError('Only the class teacher can delete this.', 403);
  if (await SubmissionModel.exists({ assignmentId: id })) {
    throw new AssignmentError('Students have already submitted; it can no longer be deleted.', 409);
  }
  await AssignmentModel.deleteOne({ _id: id });
  await Promise.all(a.attachments.map((f) => deleteFile(f)));
}

/** Student submits or resubmits (replacing the previous one) until graded. */
export async function submitWork(user: User, id: string, body: { text?: string; files?: unknown }) {
  await connectToDatabase();
  const doc = await AssignmentModel.findById(id).lean();
  if (!doc) throw new AssignmentError('Assignment not found.', 404);
  const a = out<Assignment>(doc);
  const section = await sectionOf(a.sectionId);
  if (user.role !== 'STUDENT' || !isEnrolled(section, user.id)) throw new AssignmentError('Assignment not found.', 404);

  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 10000) : '';
  const files = await checkFiles(body.files, user.id, 'SUBMISSION');
  if (!text && !files.length) throw new AssignmentError('Write an answer or attach a file.');

  const late = Date.now() > Date.parse(a.dueAt);
  if (late && !a.allowLate) throw new AssignmentError('The deadline has passed and late submissions are not accepted.', 409);

  const existing = await SubmissionModel.findOne({ assignmentId: id, studentId: user.id }).lean();
  if (existing?.gradedAt) throw new AssignmentError('This has already been graded and can no longer be changed.', 409);

  const me = section.enrolledStudents.find((s) => s.studentId === user.id)!;
  const sub: Submission = {
    id: existing?._id ?? newId('sub'),
    assignmentId: id,
    studentId: user.id,
    studentName: me.fullName,
    enrollmentNumber: me.enrollmentNumber,
    text: text || undefined,
    files,
    submittedAt: new Date().toISOString(),
    isLate: late,
  };
  const { id: _id, ...rest } = sub;
  await SubmissionModel.replaceOne({ _id }, { _id, ...rest }, { upsert: true });
  // Files from a replaced submission that are no longer used.
  for (const f of existing?.files ?? []) if (!files.includes(f)) await deleteFile(f);
  return sub;
}

export async function gradeSubmission(user: User, assignmentId: string, studentId: string, body: { marks?: number | null; feedback?: string }) {
  await connectToDatabase();
  const doc = await AssignmentModel.findById(assignmentId).lean();
  if (!doc) throw new AssignmentError('Assignment not found.', 404);
  const a = out<Assignment>(doc);
  const section = await sectionOf(a.sectionId);
  if (section.facultyId !== user.id) throw new AssignmentError('Only the class teacher can grade.', 403);

  let marks: number | null = null;
  if (a.maxMarks !== null) {
    const m = Number(body.marks);
    if (body.marks === undefined || body.marks === null || !Number.isFinite(m) || m < 0 || m > a.maxMarks) {
      throw new AssignmentError(`Marks must be between 0 and ${a.maxMarks}.`);
    }
    marks = Math.round(m * 100) / 100;
  }
  const feedback = typeof body.feedback === 'string' ? body.feedback.trim().slice(0, 2000) : undefined;
  const updated = await SubmissionModel.findOneAndUpdate(
    { assignmentId, studentId },
    { $set: { marks, feedback, gradedBy: user.id, gradedAt: new Date().toISOString() } },
    { new: true }
  ).lean();
  if (!updated) throw new AssignmentError('This student has not submitted yet.', 404);
  await notify([studentId], {
    title: 'Assignment graded',
    body: `${await label(a)}${marks !== null ? `: ${marks} / ${a.maxMarks}` : ''}`,
    tab: 'student-assignments',
  });
  return out<Submission>(updated);
}

/** For file access checks: who may read an assignment attachment or a submitted file. */
export async function canReadAssignmentFile(user: User, fileId: string, purpose: FilePurpose) {
  await connectToDatabase();
  if (purpose === 'ASSIGNMENT') {
    const a = await AssignmentModel.findOne({ attachments: fileId }, { sectionId: 1 }).lean();
    if (!a) return false;
    const acc = access(user, await sectionOf(a.sectionId));
    return acc.staff || acc.student;
  }
  if (purpose === 'SUBMISSION') {
    const s = await SubmissionModel.findOne({ files: fileId }, { assignmentId: 1 }).lean();
    if (!s) return false;
    const a = await AssignmentModel.findById(s.assignmentId, { sectionId: 1 }).lean();
    return !!a && access(user, await sectionOf(a.sectionId)).staff;
  }
  return false;
}
