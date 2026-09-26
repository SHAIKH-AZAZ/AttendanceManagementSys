import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || undefined;
    const sectionId = searchParams.get('sectionId') || undefined;
    const facultyId = searchParams.get('facultyId') || undefined;
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
  try {
    const body = await request.json();
    const {
      campusId,
      departmentId,
      trimesterId,
      courseId,
      sectionId,
      facultyId,
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
      campusId: campusId || 'campus-1',
      departmentId: departmentId || 'dept-cs',
      trimesterId: trimesterId || 'tri-2026-t2',
      courseId,
      sectionId,
      facultyId: facultyId || 'user-faculty-1',
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
