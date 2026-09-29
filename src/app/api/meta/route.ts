import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import type { AcademicMeta } from '@/types';

// Reference data the portals need to label campuses, departments, courses and sections.
export async function GET() {
  try {
    const [campuses, departments, trimesters, courses, sections, users] = await Promise.all([
      dbService.getCampuses(),
      dbService.getDepartments(),
      dbService.getTrimesters(),
      dbService.getCourses(),
      dbService.getSections(),
      dbService.getUsers(),
    ]);
    const names = new Map(users.map((u) => [u.id, u.fullName]));

    const meta: AcademicMeta = {
      campuses,
      departments,
      trimesters,
      courses,
      sections: sections.map(({ enrolledStudents, ...section }) => ({
        ...section,
        studentCount: enrolledStudents.length,
        facultyName: names.get(section.facultyId) ?? 'Unassigned',
      })),
    };

    return NextResponse.json(meta);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
