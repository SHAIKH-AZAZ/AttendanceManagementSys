import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { AssignmentError, createAssignment, listAssignments } from '@/lib/services/assignments';

const fail = (e: unknown) => NextResponse.json({ error: (e as Error).message }, { status: e instanceof AssignmentError ? e.status : 500 });

/** Assignments visible to the signed-in user. ?sectionId= */
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  try {
    const sectionId = new URL(request.url).searchParams.get('sectionId') ?? undefined;
    return NextResponse.json({ assignments: await listAssignments(auth, sectionId) });
  } catch (e) {
    return fail(e);
  }
}

/** Teacher: publish an assignment. */
export async function POST(request: Request) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    if (typeof b.title !== 'string' || !b.title.trim() || b.title.length > 120) return fail(new AssignmentError('Enter a title (up to 120 characters).'));
    if (b.instructions !== undefined && (typeof b.instructions !== 'string' || b.instructions.length > 5000)) {
      return fail(new AssignmentError('Instructions can be at most 5000 characters.'));
    }
    let maxMarks: number | null = null;
    if (b.maxMarks !== undefined && b.maxMarks !== null && b.maxMarks !== '') {
      maxMarks = Number(b.maxMarks);
      if (!Number.isFinite(maxMarks) || maxMarks < 1 || maxMarks > 1000) return fail(new AssignmentError('Marks must be between 1 and 1000, or left empty.'));
    }
    const assignment = await createAssignment(auth, {
      sectionId: String(b.sectionId ?? ''),
      title: b.title,
      instructions: b.instructions,
      dueAt: String(b.dueAt ?? ''),
      maxMarks,
      allowLate: b.allowLate !== false,
      attachments: b.attachments,
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
