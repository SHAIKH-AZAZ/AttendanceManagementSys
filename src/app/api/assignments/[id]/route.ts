import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { AssignmentError, deleteAssignment, getAssignment, updateAssignment } from '@/lib/services/assignments';

type Ctx = { params: Promise<{ id: string }> };
const fail = (e: unknown) => NextResponse.json({ error: (e as Error).message }, { status: e instanceof AssignmentError ? e.status : 500 });

export async function GET(_r: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await getAssignment(auth, (await params).id));
  } catch (e) {
    return fail(e);
  }
}

/** Teacher: extend the deadline or change late submission. { dueAt?, allowLate? } */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    return NextResponse.json({ assignment: await updateAssignment(auth, (await params).id, { dueAt: b.dueAt, allowLate: b.allowLate }) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_r: Request, { params }: Ctx) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    await deleteAssignment(auth, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
