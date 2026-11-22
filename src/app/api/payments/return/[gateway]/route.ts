import { NextResponse } from 'next/server';
import { completeReturn, type ReturnOutcome } from '@/lib/services/fees';
import { appOrigin } from '@/lib/payments';

/*
 * Where every redirect-based gateway sends the student back (GET, or a
 * cross-site POST for PayU and Paytm, which carries no session cookie).
 * Nothing the browser sends is trusted: the attempt id is looked up and the
 * gateway is asked directly. Always ends with a redirect to the Fees tab.
 */
async function handle(request: Request, { params }: { params: Promise<{ gateway: string }> }) {
  const url = new URL(request.url);
  const result: ReturnOutcome = await completeReturn((await params).gateway, url.searchParams.get('attempt') ?? '', url.searchParams.get('cancel') === '1').catch(
    (e): ReturnOutcome => {
      console.error('Payment return failed:', e);
      return { outcome: 'error' };
    }
  );
  // Only ever back into this app, never to a URL taken from the request.
  const to = new URL('/', appOrigin(request));
  to.searchParams.set('tab', 'student-fees');
  if (result.paymentId) to.searchParams.set('receipt', result.paymentId);
  else to.searchParams.set('payment', result.outcome);
  return NextResponse.redirect(to, 303);
}

export const GET = handle;
export const POST = handle;
