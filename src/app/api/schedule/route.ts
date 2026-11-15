import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getSchedule } from '@/lib/services/schedule';

/** Exams and calendar events for the signed-in user. ?from=YYYY-MM-DD (default: everything). */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getSchedule(auth, new URL(request.url).searchParams.get('from') ?? undefined));
}
