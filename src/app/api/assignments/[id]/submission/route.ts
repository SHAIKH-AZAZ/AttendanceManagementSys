import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { AssignmentError, submitWork } from '@/lib/services/assignments';

/** Student: submit or resubmit. { text?, files?: [fileId] } */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    return NextResponse.json({ submission: await submitWork(auth, (await params).id, { text: b.text, files: b.files }) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof AssignmentError ? e.status : 500 });
  }
}
