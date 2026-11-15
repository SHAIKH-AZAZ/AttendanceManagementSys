import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { AssignmentError, gradeSubmission } from '@/lib/services/assignments';

/** Teacher: grade one student's submission. { studentId, marks?, feedback? } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    if (typeof b.studentId !== 'string') return NextResponse.json({ error: 'studentId is required.' }, { status: 400 });
    return NextResponse.json({ submission: await gradeSubmission(auth, (await params).id, b.studentId, { marks: b.marks, feedback: b.feedback }) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AssignmentError ? e.status : 500 });
  }
}
