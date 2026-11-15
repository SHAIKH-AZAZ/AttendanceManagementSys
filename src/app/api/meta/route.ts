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
    // Teachers who can be assigned to classes (names only; no contact details).
    faculty: users
      .filter((u) => u.isActive && (u.role === 'FACULTY' || u.role === 'HOD'))
      .map((u) => ({ id: u.id, fullName: u.fullName, departmentId: u.departmentId, role: u.role })),
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
