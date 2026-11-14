import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireUser('FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;
    // Faculty only see their own sessions.
    const facultyId =
      auth.role === 'FACULTY' ? auth.id : searchParams.get('facultyId') || undefined;
    const isLockedStr = searchParams.get('isLocked');
    const isLocked = isLockedStr !== null ? isLockedStr === 'true' : undefined;

    const sessions = await dbService.getSessions({
      courseId,
      sectionId,
      facultyId,
      isLocked,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    const {
      campusId,
      departmentId,
      trimesterId,
      courseId,
      sectionId,
      lectureDate,
      sessionNumber,
      sessionTitle,
    } = body;

    if (!courseId || !sectionId || !lectureDate || !sessionNumber) {
      return NextResponse.json(
        { error: 'Missing required session fields' },
        { status: 400 }
      );
    }

    const session = await dbService.createSession({
      campusId: campusId || auth.campusId,
      departmentId: departmentId || auth.departmentId || 'dept-cs',
      trimesterId: trimesterId || 'tri-2026-t2',
      courseId,
      sectionId,
      facultyId: auth.id,
      lectureDate,
      sessionNumber: Number(sessionNumber),
      sessionTitle: sessionTitle || `Lecture #${sessionNumber}`,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
