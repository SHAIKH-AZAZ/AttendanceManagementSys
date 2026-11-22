import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createFee, FeeError, listFeesForAdmin } from '@/lib/services/fees';

/** Office: every fee with paid / expected counts. */
export async function GET() {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listFeesForAdmin());
}

/** Office: publish a fee; matching students are notified. Amount is in rupees. */
export async function POST(request: Request) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const fee = await createFee(auth, await request.json());
    return NextResponse.json({ fee }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
