import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { addExam, ScheduleError } from '@/lib/services/schedule';

/** Admin / exam cell: schedule an exam. */
export async function POST(request: Request) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    const exam = await addExam(auth, {
      courseId: String(b.courseId ?? ''),
      divisions: Array.isArray(b.divisions) ? b.divisions.filter((d: unknown) => typeof d === 'string') : [],
      examType: b.examType,
      date: String(b.date ?? ''),
      start: String(b.start ?? ''),
      end: String(b.end ?? ''),
      room: typeof b.room === 'string' ? b.room : '',
      note: typeof b.note === 'string' ? b.note : undefined,
    });
    return NextResponse.json({ exam }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof ScheduleError ? e.status : 500 });
  }
}
