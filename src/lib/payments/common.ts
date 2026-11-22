import type { FeePayment, PaymentGatewayId } from '@/types';

/*
 * What every payment gateway implements, in test mode only: Cashfree, PayU,
 * Paytm and PayPal call their sandbox hosts (hard-coded); Razorpay and Stripe
 * share one host for test and live, so they refuse anything but test keys.
 *
 * start():  create the gateway's order/session for one attempt and say how
 *           the browser should open checkout.
 * status(): ask the gateway, server to server, whether the attempt was paid.
 *           The browser's word is never enough.
 */

export class FeeError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface StartInput {
  attemptId: string;
  amount: number; // paise
  feeTitle: string;
  collegeName: string;
  student: { id: string; name: string; email: string };
  /** Absolute URL the gateway sends the student back to (already carries ?attempt=). */
  returnUrl: string;
  cancelUrl: string;
}

/** How the browser opens checkout. */
export type Checkout =
  | { kind: 'razorpay'; keyId: string; orderId: string; amount: number; currency: 'INR'; name: string; description: string; prefill: { name: string; email: string } }
  | { kind: 'redirect'; url: string }
  | { kind: 'form'; action: string; fields: Record<string, string> }
  | { kind: 'cashfree'; paymentSessionId: string }
  | { kind: 'paytm'; host: string; mid: string; orderId: string; token: string; amount: string };

export interface Started {
  gatewayOrderId: string;
  checkout: Checkout;
  /** Only when the gateway charges a currency other than INR. */
  charged?: { amount: number; currency: string; rate: number };
}

export interface Status {
  state: 'PAID' | 'PENDING' | 'FAILED';
  paymentId?: string;
  method?: string;
  /** Amount actually paid, in the currency's minor unit (paise, cents). */
  amount?: number;
  currency?: string;
}

export interface Gateway {
  id: PaymentGatewayId;
  /** Keys present (and test-mode where the key shows it). */
  configured(): boolean;
  start(input: StartInput): Promise<Started>;
  status(attempt: FeePayment): Promise<Status>;
  /** Gateways whose order can be retried (Razorpay) reopen it instead of creating another. */
  resume?(attempt: FeePayment): Checkout;
}

export const env = (name: string) => process.env[name]?.trim() ?? '';

/** Rupees with two decimals, as most Indian gateways want it: 4500000 → "45000.00". */
export const rupees = (paise: number) => (paise / 100).toFixed(2);
/** "45000.00" → 4500000 (also for dollars → cents). */
export const toMinor = (major: string | number) => Math.round(Number(major) * 100);

/** Students have no phone number on file; sandbox checkouts that insist on one get this. Test mode only. */
export const SANDBOX_PHONE = '9999999999';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const describe = (d: any): string =>
  d?.error?.description ?? d?.error?.message ?? d?.error_description ?? d?.message ?? d?.details?.[0]?.description ??
  d?.body?.resultInfo?.resultMsg ?? (typeof d?.error === 'string' ? d.error : '') ?? '';

/**
 * Call a gateway API. On failure the gateway's own message is passed through
 * (prefixed with its name): in test mode that's what makes setup problems,
 * like a wrong key or an unsupported currency, fixable.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callGateway<T = any>(label: string, url: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    console.error(`${label} ${url}:`, e);
    throw new FeeError(`${label} could not be reached. Please try again.`, 502);
  }
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 200) };
  }
  if (!res.ok) {
    console.error(`${label} ${url} → ${res.status}:`, text.slice(0, 500));
    throw new FeeError(`${label}: ${describe(data) || `request failed (${res.status})`}`, 502);
  }
  return data as T;
}

/**
 * This site's address as the student's browser sees it, for gateway return
 * URLs and redirects. Next's request.url carries the server's own hostname,
 * which can differ (e.g. localhost vs 127.0.0.1) and would land the student
 * on a host without their session. APP_URL overrides it when set.
 */
export function appOrigin(request: Request): string {
  const fixed = env('APP_URL').replace(/\/+$/, '');
  if (fixed) return fixed;
  const h = request.headers;
  const host = h.get('x-forwarded-host')?.split(',')[0].trim() || h.get('host');
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() || new URL(request.url).protocol.replace(':', '');
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}
