import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createAssessment, listAssessments, MarksError } from '@/lib/services/marks';

const fail = (e: unknown) =>
  NextResponse.json({ error: (e as Error).message }, { status: e instanceof MarksError ? e.status : 500 });

/** Staff: assessments they may see. ?sectionId=&status= */
export async function GET(request: Request) {
  const auth = await requireUser('FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const sp = new URL(request.url).searchParams;
    return NextResponse.json({
      assessments: await listAssessments(auth, { sectionId: sp.get('sectionId') ?? undefined, status: sp.get('status') ?? undefined }),
    });
  } catch (e) {
    return fail(e);
  }
}

/** Teacher: create an assessment for one of their classes. */
export async function POST(request: Request) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const { sectionId, title, component, date, maxMarks } = await request.json();
    const max = Number(maxMarks);
    if (typeof title !== 'string' || !title.trim() || title.length > 80) return fail(new MarksError('Enter a title (up to 80 characters).'));
    if (typeof component !== 'string' || !component.trim() || component.length > 40) return fail(new MarksError('Choose the type of assessment.'));
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(new MarksError('Enter a valid date.'));
    if (!Number.isFinite(max) || max < 1 || max > 1000) return fail(new MarksError('Maximum marks must be between 1 and 1000.'));
    const assessment = await createAssessment(auth, { sectionId: String(sectionId ?? ''), title, component, date, maxMarks: max });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
