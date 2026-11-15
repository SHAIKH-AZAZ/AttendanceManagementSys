import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireUser('FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const sectionId = searchParams.get('sectionId');
    if (!courseId || !sectionId) {
      return NextResponse.json({ error: 'courseId and sectionId are required.' }, { status: 400 });
    }

    const [courses, sections, campuses, departments, terms, stats] = await Promise.all([
      dbService.getCourses(),
      dbService.getSections(),
      dbService.getCampuses(),
      dbService.getDepartments(),
      dbService.getTrimesters(),
      dbService.getComplianceStats(courseId, sectionId),
    ]);

    const course = courses.find((c) => c.id === courseId);
    const section = sections.find((s) => s.id === sectionId);
    if (!course || !section) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }
    const campus = campuses.find((cp) => cp.id === course.campusId);
    const department = departments.find((dp) => dp.id === course.departmentId);
    const term = terms.find((t) => t.id === section.trimesterId);
    const [faculty, hod] = await Promise.all([
      dbService.getUserById(section.facultyId),
      department?.hodUserId ? dbService.getUserById(department.hodUserId) : undefined,
    ]);

    const reportData = {
      institution: {
        name: campus?.name ?? 'Government Engineering College, Modasa',
        campus: 'Affiliated to Gujarat Technological University (GTU)',
        department: department?.name ?? '',
        academicSession: term?.academicSession ?? '',
        term: term?.name ?? '',
        documentRef: `${campus?.code ?? 'GECM'}/${department?.code ?? 'DEPT'}/ATT-${Date.now().toString().slice(-6)}`,
        generatedDate: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      },
      course: {
        code: course.code,
        title: course.title,
        credits: course.credits,
        section: section.name,
        facultyName: faculty?.fullName ?? '',
      },
      metrics: {
        totalEnrolled: stats.length,
        compliantStudents: stats.filter((s) => !s.isDefaulter).length,
        defaulterStudents: stats.filter((s) => s.isDefaulter).length,
        classAveragePercentage:
          stats.length > 0 ? (stats.reduce((acc, curr) => acc + curr.percentage, 0) / stats.length).toFixed(1) : '0.0',
        thresholdRequired: '75.0%',
      },
      students: stats,
      // Real names from the database; the Principal signs by hand on the printout.
      signatories: [
        { title: 'Course faculty', name: faculty?.fullName ?? '', designation: faculty?.facultyProfile?.designation ?? '' },
        { title: 'Head of Department', name: hod?.fullName ?? '', designation: department?.name ?? '' },
        { title: 'Principal', name: '', designation: campus?.name ?? '' },
      ],
    };

    return NextResponse.json(reportData);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
