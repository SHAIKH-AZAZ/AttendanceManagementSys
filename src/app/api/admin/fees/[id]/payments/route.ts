import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { FeeError, feePayments } from '@/lib/services/fees';

/** Office: who has paid this fee (with receipts) and who hasn't yet. */
export async function GET(_r: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json(await feePayments((await params).id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
