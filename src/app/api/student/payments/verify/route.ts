import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { FeeError, verifyRazorpayPayment } from '@/lib/services/fees';

/** Student: confirm a finished Razorpay Checkout popup and get the receipt. */
export async function POST(request: Request) {
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  try {
    const payment = await verifyRazorpayPayment(auth, await request.json().catch(() => ({})));
    return NextResponse.json({ payment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
