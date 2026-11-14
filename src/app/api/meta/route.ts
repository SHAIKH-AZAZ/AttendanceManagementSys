import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

/** Academic structure for any signed-in user. Rosters are reduced to a count. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const [campuses, departments, trimesters, courses, sections, users] = await Promise.all([
    dbService.getCampuses(),
    dbService.getDepartments(),
    dbService.getTrimesters(),
    dbService.getCourses(),
    dbService.getSections(),
    dbService.getUsers(),
  ]);

  return NextResponse.json({
    campuses,
    departments,
    trimesters,
    courses,
    sections: sections.map(({ enrolledStudents, ...s }) => ({
      ...s,
      studentCount: enrolledStudents.length,
      facultyName: users.find((u) => u.id === s.facultyId)?.fullName ?? 'Unassigned',
    })),
  });
}
