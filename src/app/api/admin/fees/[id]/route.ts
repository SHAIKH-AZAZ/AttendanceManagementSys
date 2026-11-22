import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { FeeError, removeFee } from '@/lib/services/fees';

export async function DELETE(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    await removeFee(auth, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
