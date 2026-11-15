import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { MarksError, stats, submitAssessment } from '@/lib/services/marks';

export async function POST(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const assessment = await submitAssessment(auth, (await params).id);
    return NextResponse.json({ assessment: { ...assessment, stats: stats(assessment) } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof MarksError ? e.status : 500 });
  }
}
