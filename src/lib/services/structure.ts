import { randomBytes } from 'node:crypto';
import type { Course, Section } from '@/types';
import { CourseModel, SectionModel, UserModel } from '@/models';
import { connectToDatabase } from '../mongodb';
import { dbService } from '../db-service';

type Actor = { id: string; fullName: string };
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

export async function createCourse(
  data: { code: string; title: string; credits: number; campusId: string; departmentId: string },
  actor: Actor
): Promise<Course> {
  await connectToDatabase();
  const code = data.code.trim().toUpperCase();
  if (await CourseModel.exists({ code, departmentId: data.departmentId })) {
    throw new Error(`Subject ${code} already exists in this department.`);
  }
  const course: Course = { id: newId('course'), ...data, code, title: data.title.trim() };
  const { id: _id, ...rest } = course;
  await CourseModel.create({ _id, ...rest });
  await dbService.addSystemAudit({
    userId: actor.id,
    userName: actor.fullName,
    action: 'SUBJECT_CREATED',
    entityName: 'Course',
    entityId: course.id,
    details: `Created subject ${code} · ${course.title}`,
  });
  return course;
}

/** The faculty must exist, be active, teach (FACULTY or HOD) and belong to the class's department. */
async function assertTeacher(facultyId: string, departmentId: string) {
  const f = await UserModel.findById(facultyId).lean();
  if (!f || !f.isActive || !['FACULTY', 'HOD'].includes(f.role)) throw new Error('Choose an active faculty member.');
  if (f.departmentId !== departmentId) throw new Error('That faculty member belongs to another department.');
}

export async function createSection(
  data: {
    courseId: string;
    name: string;
    kind: 'THEORY' | 'LAB';
    defaultPeriods: number;
    divisions: string[];
    batch?: string;
    facultyId: string;
    trimesterId: string;
  },
  actor: Actor
): Promise<Section> {
  await connectToDatabase();
  const course = await CourseModel.findById(data.courseId).lean();
  if (!course) throw new Error('Subject not found.');
  await assertTeacher(data.facultyId, course.departmentId);
  const section: Section = {
    id: newId('sec'),
    campusId: course.campusId,
    departmentId: course.departmentId,
    trimesterId: data.trimesterId,
    courseId: data.courseId,
    name: data.name.trim(),
    facultyId: data.facultyId,
    kind: data.kind,
    defaultPeriods: data.defaultPeriods,
    divisions: data.divisions.map((d) => d.trim().toUpperCase()).filter(Boolean),
    batch: data.batch?.trim().toUpperCase() || undefined,
    enrolledStudents: [],
  };
  const { id: _id, ...rest } = section;
  await SectionModel.create({ _id, ...rest });
  await dbService.addSystemAudit({
    userId: actor.id,
    userName: actor.fullName,
    action: 'CLASS_CREATED',
    entityName: 'Section',
    entityId: section.id,
    details: `Created class ${course.code} · ${section.name}`,
  });
  return section;
}

/** Subject allocation: give a class to another teacher. Past lectures keep their original teacher. */
export async function allocateFaculty(sectionId: string, facultyId: string, actor: Actor): Promise<Section> {
  await connectToDatabase();
  const section = await SectionModel.findById(sectionId).lean();
  if (!section) throw new Error('Class not found.');
  await assertTeacher(facultyId, section.departmentId);
  const updated = await SectionModel.findByIdAndUpdate(sectionId, { $set: { facultyId } }, { new: true }).lean();
  const [from, to] = await Promise.all([UserModel.findById(section.facultyId).lean(), UserModel.findById(facultyId).lean()]);
  await dbService.addSystemAudit({
    userId: actor.id,
    userName: actor.fullName,
    action: 'CLASS_ALLOCATED',
    entityName: 'Section',
    entityId: sectionId,
    details: `${section.name}: ${from?.fullName ?? section.facultyId} → ${to?.fullName ?? facultyId}`,
  });
  const { _id, ...rest } = updated!;
  return { id: _id, ...rest } as Section;
}
