import { randomBytes } from 'node:crypto';
import type { CalendarEvent, ExamSlot, ExamType, User } from '@/types';
import { CalendarEventModel, CourseModel, ExamSlotModel, SectionModel } from '@/models';
import { connectToDatabase } from '../mongodb';
import { dbService } from '../db-service';
import { notify } from './notifications';

/*
 * Exam timetable and academic calendar. Admin publishes; everyone sees what
 * applies to them (students: their divisions; teachers: their subjects).
 */

export class ScheduleError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const EXAM_TYPES: Record<ExamType, string> = {
  MID_SEM: 'Mid-semester exam',
  UNIT_TEST: 'Unit test',
  PRACTICAL: 'Practical exam',
  VIVA: 'Viva',
  GTU_EXTERNAL: 'GTU external exam',
  OTHER: 'Exam',
};

const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const out = <T>(d: any): T => {
  const { _id, ...rest } = d;
  return { id: _id, ...rest } as T;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Divisions a student belongs to, from the classes they are enrolled in. */
async function studentDivisions(userId: string) {
  const secs = await SectionModel.find({ 'enrolledStudents.studentId': userId }, { divisions: 1, courseId: 1 }).lean();
  return { divisions: [...new Set(secs.flatMap((s) => s.divisions ?? []))], courseIds: [...new Set(secs.map((s) => s.courseId))] };
}

/** Exams and calendar events relevant to this user, from `from` onwards (default: today). */
export async function getSchedule(user: User, from?: string) {
  await connectToDatabase();
  const since = from && DATE.test(from) ? from : '0000-01-01';
  let examFilter: Record<string, unknown> = { date: { $gte: since } };
  let audience: string[] = ['ALL', 'STUDENTS', 'STAFF'];

  if (user.role === 'STUDENT') {
    const { divisions, courseIds } = await studentDivisions(user.id);
    examFilter = { ...examFilter, courseId: { $in: courseIds }, divisions: { $in: divisions } };
    audience = ['ALL', 'STUDENTS'];
  } else if (user.role === 'FACULTY') {
    const courseIds = (await SectionModel.find({ facultyId: user.id }, { courseId: 1 }).lean()).map((s) => s.courseId);
    examFilter = { ...examFilter, courseId: { $in: courseIds } };
    audience = ['ALL', 'STAFF'];
  } else if (user.role === 'HOD') {
    const courseIds = (await CourseModel.find({ departmentId: user.departmentId }, { _id: 1 }).lean()).map((c) => c._id);
    examFilter = { ...examFilter, courseId: { $in: courseIds } };
    audience = ['ALL', 'STAFF'];
  }

  const [exams, events, courses] = await Promise.all([
    ExamSlotModel.find(examFilter).sort({ date: 1, start: 1 }).lean(),
    CalendarEventModel.find({
      audience: { $in: audience as CalendarEvent['audience'][] },
      $or: [{ date: { $gte: since } }, { endDate: { $gte: since } }],
    } as Record<string, unknown>)
      .sort({ date: 1 })
      .lean(),
    CourseModel.find({}, { code: 1, title: 1 }).lean(),
  ]);
  const byId = new Map(courses.map((c) => [c._id, c]));
  return {
    exams: exams.map((e) => {
      const x = out<ExamSlot>(e);
      const c = byId.get(x.courseId);
      return { ...x, courseCode: c?.code ?? '', courseTitle: c?.title ?? '', typeLabel: EXAM_TYPES[x.examType] ?? 'Exam' };
    }),
    events: events.map((e) => out<CalendarEvent>(e)),
  };
}

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start < b.end && b.start < a.end;

export async function addExam(
  user: User,
  b: { courseId: string; divisions: string[]; examType: ExamType; date: string; start: string; end: string; room?: string; note?: string }
) {
  await connectToDatabase();
  if (!EXAM_TYPES[b.examType]) throw new ScheduleError('Choose the exam type.');
  if (!DATE.test(b.date)) throw new ScheduleError('Enter a valid date.');
  if (!TIME.test(b.start) || !TIME.test(b.end) || b.start >= b.end) throw new ScheduleError('Enter a start time before the end time.');
  const divisions = [...new Set(b.divisions.map((d) => d.trim().toUpperCase()).filter(Boolean))];
  if (!divisions.length || divisions.length > 6) throw new ScheduleError('Enter 1–6 divisions, e.g. 5CEA.');
  const course = await CourseModel.findById(b.courseId).lean();
  if (!course) throw new ScheduleError('Subject not found.');
  const room = (b.room ?? '').trim().slice(0, 20);

  // Clashes: the same division, or the same room, booked at an overlapping time that day.
  const sameDay = (await ExamSlotModel.find({ date: b.date }).lean()).map((e) => out<ExamSlot>(e));
  const divClash = sameDay.find((e) => overlaps(e, b) && e.divisions.some((d) => divisions.includes(d)));
  if (divClash) throw new ScheduleError(`${divClash.divisions.filter((d) => divisions.includes(d)).join(', ')} already has an exam at ${divClash.start}–${divClash.end} that day.`, 409);
  const roomClash = room && sameDay.find((e) => overlaps(e, b) && e.room.toUpperCase() === room.toUpperCase());
  if (roomClash) throw new ScheduleError(`Room ${room} is already booked at ${roomClash.start}–${roomClash.end}.`, 409);

  const exam: ExamSlot = {
    id: newId('exam'),
    courseId: course._id,
    divisions,
    examType: b.examType,
    date: b.date,
    start: b.start,
    end: b.end,
    room,
    note: b.note?.trim().slice(0, 200) || undefined,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };
  const { id: _id, ...rest } = exam;
  await ExamSlotModel.create({ _id, ...rest });

  await dbService.addSystemAudit({
    userId: user.id,
    userName: user.fullName,
    action: 'EXAM_SCHEDULED',
    entityName: 'ExamSlot',
    entityId: exam.id,
    details: `${course.code} ${EXAM_TYPES[exam.examType]} for ${divisions.join(', ')} on ${exam.date} ${exam.start}–${exam.end}${room ? `, room ${room}` : ''}`,
  });
  // Students of those divisions taking this subject.
  const secs = await SectionModel.find({ courseId: course._id, divisions: { $in: divisions } }, { enrolledStudents: 1, facultyId: 1 }).lean();
  await notify(
    secs.flatMap((s) => s.enrolledStudents.map((e) => e.studentId)),
    { title: 'Exam scheduled', body: `${course.code} ${EXAM_TYPES[exam.examType]} · ${exam.date} ${exam.start}${room ? ` · room ${room}` : ''}`, tab: 'student-schedule' }
  );
  await notify(secs.map((s) => s.facultyId), { title: 'Exam scheduled', body: `${course.code} ${EXAM_TYPES[exam.examType]} for ${divisions.join(', ')} · ${exam.date} ${exam.start}`, tab: 'faculty-schedule' });
  return exam;
}

export async function removeExam(user: User, id: string) {
  await connectToDatabase();
  const e = await ExamSlotModel.findByIdAndDelete(id).lean();
  if (!e) throw new ScheduleError('Exam not found.', 404);
  await dbService.addSystemAudit({ userId: user.id, userName: user.fullName, action: 'EXAM_REMOVED', entityName: 'ExamSlot', entityId: id, details: `Removed exam on ${e.date} ${e.start}` });
}

export async function addEvent(
  user: User,
  b: { title: string; kind: CalendarEvent['kind']; date: string; endDate?: string; audience?: CalendarEvent['audience']; note?: string }
) {
  await connectToDatabase();
  if (!b.title?.trim() || b.title.length > 100) throw new ScheduleError('Enter a title (up to 100 characters).');
  if (!['HOLIDAY', 'EVENT', 'DEADLINE'].includes(b.kind)) throw new ScheduleError('Choose holiday, event or deadline.');
  if (!DATE.test(b.date)) throw new ScheduleError('Enter a valid date.');
  if (b.endDate && (!DATE.test(b.endDate) || b.endDate < b.date)) throw new ScheduleError('The end date must be on or after the start date.');
  const ev: CalendarEvent = {
    id: newId('event'),
    title: b.title.trim(),
    kind: b.kind,
    date: b.date,
    endDate: b.endDate && b.endDate !== b.date ? b.endDate : undefined,
    audience: b.audience && ['ALL', 'STUDENTS', 'STAFF'].includes(b.audience) ? b.audience : 'ALL',
    note: b.note?.trim().slice(0, 300) || undefined,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };
  const { id: _id, ...rest } = ev;
  await CalendarEventModel.create({ _id, ...rest });
  await dbService.addSystemAudit({ userId: user.id, userName: user.fullName, action: 'CALENDAR_EVENT_ADDED', entityName: 'CalendarEvent', entityId: ev.id, details: `${ev.kind.toLowerCase()}: ${ev.title} (${ev.date}${ev.endDate ? ` to ${ev.endDate}` : ''})` });
  return ev;
}

export async function removeEvent(user: User, id: string) {
  await connectToDatabase();
  const e = await CalendarEventModel.findByIdAndDelete(id).lean();
  if (!e) throw new ScheduleError('Event not found.', 404);
  await dbService.addSystemAudit({ userId: user.id, userName: user.fullName, action: 'CALENDAR_EVENT_REMOVED', entityName: 'CalendarEvent', entityId: id, details: `Removed ${e.title}` });
}

/** The holiday covering this date, if any (lectures can't be started on holidays). */
export async function holidayOn(date: string) {
  await connectToDatabase();
  const h = await CalendarEventModel.findOne({
    kind: 'HOLIDAY',
    $or: [{ date }, { date: { $lte: date }, endDate: { $gte: date } }],
  }).lean();
  return h ? out<CalendarEvent>(h) : null;
}
