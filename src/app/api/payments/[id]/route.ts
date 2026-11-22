import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { FeeError, getReceipt } from '@/lib/services/fees';

/** A fee receipt: the student who paid it, or the office. */
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('STUDENT', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ payment: await getReceipt(auth, (await params).id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
