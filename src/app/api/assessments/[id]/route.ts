import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { deleteAssessment, getAssessment, MarksError, saveAssessment, stats } from '@/lib/services/marks';

type Ctx = { params: Promise<{ id: string }> };
const fail = (e: unknown) =>
  NextResponse.json({ error: (e as Error).message }, { status: e instanceof MarksError ? e.status : 500 });

export async function GET(_r: Request, { params }: Ctx) {
  const auth = await requireUser('FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { assessment } = await getAssessment(auth, (await params).id);
    return NextResponse.json({ assessment: { ...assessment, stats: stats(assessment) } });
  } catch (e) {
    return fail(e);
  }
}

/** Teacher: save marks while in draft. Body: { entries: [{ studentId, marks, absent, remark }], title?, date?, maxMarks? } */
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    if (body.entries !== undefined && (!Array.isArray(body.entries) || body.entries.length > 500)) {
      return fail(new MarksError('Invalid marks list.'));
    }
    if (body.maxMarks !== undefined) {
      const m = Number(body.maxMarks);
      if (!Number.isFinite(m) || m < 1 || m > 1000) return fail(new MarksError('Maximum marks must be between 1 and 1000.'));
      body.maxMarks = m;
    }
    const assessment = await saveAssessment(auth, (await params).id, body);
    return NextResponse.json({ assessment: { ...assessment, stats: stats(assessment) } });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_r: Request, { params }: Ctx) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    await deleteAssessment(auth, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
