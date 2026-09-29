import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import type { UniversityReport } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || 'course-ds';
    const sectionId = searchParams.get('sectionId') || 'sec-ds-a';

    const courses = await dbService.getCourses();
    const sections = await dbService.getSections();
    const campuses = await dbService.getCampuses();
    const departments = await dbService.getDepartments();

    const course = courses.find((c) => c.id === courseId);
    const section = sections.find((s) => s.id === sectionId);
    const campus = campuses.find((cp) => cp.id === (course?.campusId || 'campus-1'));
    const department = departments.find((dp) => dp.id === (course?.departmentId || 'dept-cs'));
    const trimester = (await dbService.getTrimesters()).find((t) => t.id === section?.trimesterId);
    const instructor = section ? await dbService.getUserById(section.facultyId) : undefined;
    const hod = department?.hodUserId ? await dbService.getUserById(department.hodUserId) : undefined;

    const stats = await dbService.getComplianceStats(courseId, sectionId);

    const reportData: UniversityReport = {
      institution: {
        name: 'STATE UNIVERSITY OF ADVANCED TECHNOLOGY & SCIENCES',
        campus: campus?.name || 'North Campus',
        department: department?.name || 'Department of Computer Science & Engineering',
        academicSession: trimester?.academicSession || '2026-2027',
        term: trimester?.name || 'Trimester 2 (Spring 2026)',
        documentRef: `SUATS/CSE/ATT-SUB-${Date.now().toString().slice(-6)}`,
        generatedDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
      course: {
        code: course?.code || 'CS-301',
        title: course?.title || 'Data Structures & Algorithms',
        credits: course?.credits || 4,
        section: section?.name || 'Section A',
        facultyName: instructor?.fullName || 'Not assigned',
      },
      metrics: {
        totalEnrolled: stats.length,
        compliantStudents: stats.filter((s) => !s.isDefaulter).length,
        defaulterStudents: stats.filter((s) => s.isDefaulter).length,
        classAveragePercentage:
          stats.length > 0
            ? (stats.reduce((acc, curr) => acc + curr.percentage, 0) / stats.length).toFixed(1)
            : '0.0',
        thresholdRequired: '75.0%',
      },
      students: stats,
      signatories: [
        {
          title: 'Course Instructor',
          name: instructor?.fullName || '',
          designation: instructor?.facultyProfile?.designation || 'Faculty',
        },
        {
          title: 'Head of Department',
          name: hod?.fullName || '',
          designation: `Head, ${department?.code || 'Department'}`,
        },
        { title: 'Dean of Academic Affairs', name: 'Dr. P. K. Singhania', designation: 'Dean (Academics)' },
        { title: 'Controller of Examinations', name: 'Dr. M. S. Varma', designation: 'Registrar & COE' },
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
