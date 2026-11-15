import { randomBytes } from 'node:crypto';
import type { Assessment, MarkEntry, Section, User } from '@/types';
import { AssessmentModel, CourseModel, SectionModel, UserModel } from '@/models';
import { connectToDatabase } from '../mongodb';
import { dbService } from '../db-service';
import { notify } from './notifications';
import { MARKS_NEED_HOD_APPROVAL } from '../rules';

/*
 * Marks for exams, tests and vivas. Flow:
 *   DRAFT (teacher enters marks) → SUBMITTED (HOD reviews) → PUBLISHED (students see it)
 * HOD can return a submission to DRAFT with a comment. Published marks are locked.
 */

const newId = () => `asmt-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const out = (d: any): Assessment => {
  const { _id, ...rest } = d;
  return { id: _id, ...rest };
};

export class MarksError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export function stats(a: Pick<Assessment, 'entries' | 'maxMarks'>) {
  const scored = a.entries.filter((e) => !e.absent && e.marks !== null).map((e) => e.marks as number);
  const absent = a.entries.filter((e) => e.absent).length;
  const pending = a.entries.length - scored.length - absent;
  const avg = scored.length ? scored.reduce((x, y) => x + y, 0) / scored.length : null;
  return {
    students: a.entries.length,
    entered: scored.length,
    absent,
    pending,
    average: avg === null ? null : Math.round(avg * 100) / 100,
    highest: scored.length ? Math.max(...scored) : null,
    lowest: scored.length ? Math.min(...scored) : null,
  };
}

async function sectionOrThrow(sectionId: string): Promise<Section> {
  const s = await SectionModel.findById(sectionId).lean();
  if (!s) throw new MarksError('Class not found.', 404);
  const { _id, ...rest } = s;
  return { id: _id, ...rest } as Section;
}

/** Who may see an assessment's full list: its teacher, the department HOD, admin staff. */
export function canView(user: User, a: Assessment, section: Section) {
  if (user.role === 'ADMIN_STAFF') return true;
  if (user.role === 'HOD') return a.departmentId === user.departmentId;
  if (user.role === 'FACULTY') return section.facultyId === user.id;
  return false;
}

export async function getAssessment(user: User, id: string) {
  await connectToDatabase();
  const doc = await AssessmentModel.findById(id).lean();
  if (!doc) throw new MarksError('Assessment not found.', 404);
  const a = out(doc);
  const section = await sectionOrThrow(a.sectionId);
  if (!canView(user, a, section)) throw new MarksError('Assessment not found.', 404);
  return { assessment: a, section };
}

/** Assessments visible to this staff member, optionally for one class or status. */
export async function listAssessments(user: User, filter: { sectionId?: string; status?: string }) {
  await connectToDatabase();
  const q: Record<string, unknown> = {};
  if (filter.sectionId) q.sectionId = filter.sectionId;
  if (filter.status) q.status = filter.status;
  if (user.role === 'HOD') q.departmentId = user.departmentId;
  if (user.role === 'FACULTY') {
    const mine = await SectionModel.find({ facultyId: user.id }, { _id: 1 }).lean();
    q.sectionId = filter.sectionId
      ? mine.some((s) => s._id === filter.sectionId)
        ? filter.sectionId
        : '__none__'
      : { $in: mine.map((s) => s._id) };
  }
  const docs = await AssessmentModel.find(q).sort({ date: -1, createdAt: -1 }).lean();
  return docs.map((d) => {
    const a = out(d);
    return { ...a, stats: stats(a) };
  });
}

export async function createAssessment(
  user: User,
  data: { sectionId: string; title: string; component: string; date: string; maxMarks: number }
) {
  await connectToDatabase();
  const section = await sectionOrThrow(data.sectionId);
  if (section.facultyId !== user.id) throw new MarksError('You do not teach this class.', 403);
  if (!section.enrolledStudents.length) throw new MarksError('This class has no students yet.');

  const a: Assessment = {
    id: newId(),
    sectionId: section.id,
    courseId: section.courseId,
    departmentId: section.departmentId,
    title: data.title.trim(),
    component: data.component.trim(),
    date: data.date,
    maxMarks: data.maxMarks,
    status: 'DRAFT',
    createdBy: user.id,
    createdAt: new Date().toISOString(),
    entries: section.enrolledStudents.map((s) => ({
      studentId: s.studentId,
      enrollmentNumber: s.enrollmentNumber,
      studentName: s.fullName,
      marks: null,
      absent: false,
    })),
  };
  const { id: _id, ...rest } = a;
  await AssessmentModel.create({ _id, ...rest });
  return a;
}

/** Check and normalise marks sent by the browser against the roster and the maximum. */
function mergeEntries(current: MarkEntry[], incoming: Partial<MarkEntry>[], maxMarks: number): MarkEntry[] {
  const byId = new Map(incoming.map((e) => [e.studentId, e]));
  for (const id of byId.keys()) {
    if (!current.some((c) => c.studentId === id)) throw new MarksError(`Student ${id} is not in this class.`);
  }
  return current.map((c) => {
    const e = byId.get(c.studentId);
    if (!e) return c;
    const absent = e.absent === true;
    let marks: number | null = null;
    if (!absent && e.marks !== null && e.marks !== undefined && (e.marks as unknown) !== '') {
      const m = Number(e.marks);
      if (!Number.isFinite(m) || m < 0 || m > maxMarks) {
        throw new MarksError(`${c.studentName}: marks must be between 0 and ${maxMarks}.`);
      }
      marks = Math.round(m * 100) / 100;
    }
    return { ...c, absent, marks, remark: typeof e.remark === 'string' ? e.remark.slice(0, 120) : c.remark };
  });
}

/** Teacher saves marks (and optionally title/date/max) while the assessment is a draft. */
export async function saveAssessment(
  user: User,
  id: string,
  body: { entries?: Partial<MarkEntry>[]; title?: string; date?: string; maxMarks?: number }
) {
  const { assessment: a, section } = await getAssessment(user, id);
  if (section.facultyId !== user.id) throw new MarksError('Only the class teacher can edit these marks.', 403);
  if (a.status !== 'DRAFT') throw new MarksError('These marks are already submitted and can no longer be edited.', 409);

  const maxMarks = body.maxMarks ?? a.maxMarks;
  const entries = mergeEntries(a.entries, body.entries ?? [], maxMarks);
  const over = entries.find((e) => e.marks !== null && e.marks > maxMarks);
  if (over) throw new MarksError(`${over.studentName} has more marks than the new maximum (${maxMarks}).`);

  const set: Record<string, unknown> = { entries };
  if (body.title) set.title = body.title.trim();
  if (body.date) set.date = body.date;
  if (body.maxMarks) set.maxMarks = maxMarks;
  const updated = await AssessmentModel.findOneAndUpdate({ _id: id, status: 'DRAFT' }, { $set: set }, { new: true }).lean();
  if (!updated) throw new MarksError('These marks are already submitted and can no longer be edited.', 409);
  return out(updated);
}

async function hodsOf(departmentId: string) {
  const hods = await UserModel.find({ role: 'HOD', isActive: true, departmentId }, { _id: 1 }).lean();
  return hods.map((h) => h._id);
}

async function subjectLabel(a: Assessment) {
  const c = await CourseModel.findById(a.courseId, { code: 1 }).lean();
  return `${c?.code ?? ''} ${a.title}`.trim();
}

/** Teacher submits: every student needs marks or "absent". Goes to the HOD (or straight to students). */
export async function submitAssessment(user: User, id: string) {
  const { assessment: a, section } = await getAssessment(user, id);
  if (section.facultyId !== user.id) throw new MarksError('Only the class teacher can submit these marks.', 403);
  if (a.status !== 'DRAFT') throw new MarksError('Already submitted.', 409);
  const missing = a.entries.filter((e) => !e.absent && e.marks === null).length;
  if (missing) throw new MarksError(`Enter marks or mark absent for all students (${missing} left).`);

  const now = new Date().toISOString();
  const status = MARKS_NEED_HOD_APPROVAL ? 'SUBMITTED' : 'PUBLISHED';
  const updated = await AssessmentModel.findOneAndUpdate(
    { _id: id, status: 'DRAFT' },
    { $set: { status, submittedAt: now, ...(status === 'PUBLISHED' ? { publishedAt: now } : {}) }, $unset: { reviewComment: 1 } },
    { new: true }
  ).lean();
  if (!updated) throw new MarksError('Already submitted.', 409);
  const label = await subjectLabel(a);

  await dbService.addSystemAudit({
    userId: user.id,
    userName: user.fullName,
    action: status === 'PUBLISHED' ? 'MARKS_PUBLISHED' : 'MARKS_SUBMITTED',
    entityName: 'Assessment',
    entityId: id,
    details: `${label} · ${section.name}: ${stats(a).entered} marked, ${stats(a).absent} absent, out of ${a.maxMarks}`,
  });
  if (status === 'SUBMITTED') {
    await notify(await hodsOf(a.departmentId), { title: 'Marks to review', body: `${label} · ${section.name} from ${user.fullName}`, tab: 'hod-marks' });
  } else {
    await notify(a.entries.map((e) => e.studentId), { title: 'New marks published', body: label, tab: 'student-marks' });
  }
  return out(updated);
}

/** HOD approves (publishes to students) or returns the marks to the teacher with a comment. */
export async function reviewAssessment(user: User, id: string, decision: 'APPROVE' | 'RETURN', comment?: string) {
  const { assessment: a, section } = await getAssessment(user, id);
  if (user.role !== 'HOD' || a.departmentId !== user.departmentId) throw new MarksError('Only the department HOD can review these marks.', 403);
  if (a.status !== 'SUBMITTED') throw new MarksError('These marks are not waiting for review.', 409);
  if (decision === 'RETURN' && !comment?.trim()) throw new MarksError('Say what needs to change.');

  const now = new Date().toISOString();
  const set =
    decision === 'APPROVE'
      ? { status: 'PUBLISHED', publishedAt: now, reviewedBy: user.id }
      : { status: 'DRAFT', reviewedBy: user.id, reviewComment: comment!.trim().slice(0, 300) };
  const updated = await AssessmentModel.findOneAndUpdate({ _id: id, status: 'SUBMITTED' }, { $set: set }, { new: true }).lean();
  if (!updated) throw new MarksError('These marks are not waiting for review.', 409);
  const label = await subjectLabel(a);

  await dbService.addSystemAudit({
    userId: user.id,
    userName: user.fullName,
    action: decision === 'APPROVE' ? 'MARKS_PUBLISHED' : 'MARKS_RETURNED',
    entityName: 'Assessment',
    entityId: id,
    details: `${label} · ${section.name}${decision === 'RETURN' ? `: ${comment}` : ''}`,
  });
  if (decision === 'APPROVE') {
    await notify(a.entries.map((e) => e.studentId), { title: 'New marks published', body: label, tab: 'student-marks' });
    await notify([section.facultyId], { title: 'Marks approved', body: `${label} · ${section.name} is now visible to students.`, tab: 'faculty-marks' });
  } else {
    await notify([section.facultyId], { title: 'Marks returned', body: `${label} · ${section.name}: ${comment}`, tab: 'faculty-marks' });
  }
  return out(updated);
}

export async function deleteAssessment(user: User, id: string) {
  const { assessment: a, section } = await getAssessment(user, id);
  if (section.facultyId !== user.id) throw new MarksError('Only the class teacher can delete this.', 403);
  if (a.status !== 'DRAFT') throw new MarksError('Only drafts can be deleted.', 409);
  await AssessmentModel.deleteOne({ _id: id, status: 'DRAFT' });
}

/** A student's published marks, grouped by subject, with class statistics but no other student's marks. */
export async function studentMarks(studentId: string) {
  await connectToDatabase();
  const docs = await AssessmentModel.find({ status: 'PUBLISHED', 'entries.studentId': studentId }).sort({ date: -1 }).lean();
  const courses = new Map((await CourseModel.find().lean()).map((c) => [c._id, c]));
  const subjects = new Map<string, { courseId: string; code: string; title: string; items: unknown[]; scored: number; max: number }>();

  for (const d of docs) {
    const a = out(d);
    const mine = a.entries.find((e) => e.studentId === studentId)!;
    const s = stats(a);
    const c = courses.get(a.courseId);
    const row = subjects.get(a.courseId) ?? { courseId: a.courseId, code: c?.code ?? '', title: c?.title ?? '', items: [], scored: 0, max: 0 };
    row.items.push({
      id: a.id,
      title: a.title,
      component: a.component,
      date: a.date,
      maxMarks: a.maxMarks,
      marks: mine.marks,
      absent: mine.absent,
      remark: mine.remark,
      classAverage: s.average,
      classHighest: s.highest,
    });
    if (!mine.absent && mine.marks !== null) row.scored += mine.marks;
    row.max += a.maxMarks;
    subjects.set(a.courseId, row);
  }
  return [...subjects.values()];
}
