import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { studentMarks } from '@/lib/services/marks';

/** Student: their own published marks, by subject. */
export async function GET() {
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ subjects: await studentMarks(auth.id) });
}
