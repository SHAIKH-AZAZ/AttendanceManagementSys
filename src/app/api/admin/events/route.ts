import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { addEvent, ScheduleError } from '@/lib/services/schedule';

/** Admin: add a holiday, event or deadline to the academic calendar. */
export async function POST(request: Request) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    const event = await addEvent(auth, { title: b.title, kind: b.kind, date: String(b.date ?? ''), endDate: b.endDate || undefined, audience: b.audience, note: b.note });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof ScheduleError ? e.status : 500 });
  }
}
