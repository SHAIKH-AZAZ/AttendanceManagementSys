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

    // HODs only see lectures from their own department.
    return NextResponse.json({
      sessions: auth.role === 'HOD' ? sessions.filter((x) => x.departmentId === auth.departmentId) : sessions,
    });
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
    const { sectionId, lectureDate, sessionTitle } = await request.json();

    if (typeof sectionId !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(lectureDate ?? '')) {
      return NextResponse.json(
        { error: 'A class and a valid lecture date are required.' },
        { status: 400 }
      );
    }

    // The section record is the source of truth for who teaches a class.
    const section = (await dbService.getSections()).find((s) => s.id === sectionId);
    if (!section) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    }
    if (section.facultyId !== auth.id) {
      return NextResponse.json({ error: 'You do not teach this class.' }, { status: 403 });
    }

    const existing = await dbService.getSessions({ sectionId });
    const draft = existing.find((s) => !s.isLocked);
    if (draft) {
      return NextResponse.json(
        { error: 'Finish or submit the open draft for this class first.', draftId: draft.id },
        { status: 409 }
      );
    }

    const sessionNumber = existing.reduce((max, s) => Math.max(max, s.sessionNumber), 0) + 1;
    const title = typeof sessionTitle === 'string' ? sessionTitle.trim().slice(0, 120) : '';

    const session = await dbService.createSession({
      campusId: section.campusId,
      departmentId: section.departmentId,
      trimesterId: section.trimesterId,
      courseId: section.courseId,
      sectionId,
      facultyId: auth.id,
      lectureDate,
      sessionNumber,
      sessionTitle: title || `Lecture ${sessionNumber}`,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
