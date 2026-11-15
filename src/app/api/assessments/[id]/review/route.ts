import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { MarksError, reviewAssessment, stats } from '@/lib/services/marks';

/** HOD: { decision: "APPROVE" | "RETURN", comment? } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('HOD');
  if (auth instanceof NextResponse) return auth;
  try {
    const { decision, comment } = await request.json();
    if (decision !== 'APPROVE' && decision !== 'RETURN') {
      return NextResponse.json({ error: 'Decision must be APPROVE or RETURN.' }, { status: 400 });
    }
    const assessment = await reviewAssessment(auth, (await params).id, decision, typeof comment === 'string' ? comment : undefined);
    return NextResponse.json({ assessment: { ...assessment, stats: stats(assessment) } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof MarksError ? e.status : 500 });
  }
}
