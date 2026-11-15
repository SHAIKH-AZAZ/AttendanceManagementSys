import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';
import { holidayOn } from '@/lib/services/schedule';
import { ATTENDANCE_ENTRY_WINDOW_DAYS, daysBefore, todayIST } from '@/lib/rules';

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
  let sectionId: string | undefined;
  try {
    const body = await request.json();
    sectionId = body.sectionId;
    const { lectureDate, sessionTitle, periods: rawPeriods } = body;

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

    // Periods this lecture covered (2-hour lab = 2). Default comes from the class.
    const periods = rawPeriods === undefined ? section.defaultPeriods ?? 1 : Number(rawPeriods);
    if (!Number.isInteger(periods) || periods < 1 || periods > 3) {
      return NextResponse.json({ error: 'Periods must be 1, 2 or 3.' }, { status: 400 });
    }

    const today = todayIST();
    if (lectureDate > today) {
      return NextResponse.json({ error: "A lecture can't be entered for a future date." }, { status: 400 });
    }
    if (lectureDate < daysBefore(today, ATTENDANCE_ENTRY_WINDOW_DAYS)) {
      return NextResponse.json(
        { error: `Lectures can be entered at most ${ATTENDANCE_ENTRY_WINDOW_DAYS} days late. Ask your HOD to add older lectures.` },
        { status: 400 }
      );
    }

    const holiday = await holidayOn(lectureDate);
    if (holiday) {
      return NextResponse.json({ error: `${lectureDate} is a holiday (${holiday.title}). No lectures can be entered for it.` }, { status: 400 });
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
      periods,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    // Two requests can race past the draft check above; the database's
    // one-draft-per-class index rejects the loser. Answer it like the check would.
    if ((error as Error).message.startsWith('Finish or submit the open draft')) {
      const draft = sectionId ? (await dbService.getSessions({ sectionId, isLocked: false }))[0] : undefined;
      return NextResponse.json({ error: (error as Error).message, draftId: draft?.id }, { status: 409 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
