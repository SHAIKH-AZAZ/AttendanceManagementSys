import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createOrder, FeeError } from '@/lib/services/fees';
import { appOrigin } from '@/lib/payments';

/** Student: start paying this fee through the chosen gateway (amount comes from the fee, not the browser). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  try {
    const { gateway } = await request.json().catch(() => ({}));
    return NextResponse.json(await createOrder(auth, (await params).id, gateway, appOrigin(request)));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof FeeError ? e.status : 500 });
  }
}
