import { callGateway, env, FeeError, toMinor, type Gateway, type Status } from './common';

/*
 * PayPal: Orders v2, approval on PayPal's sandbox site (redirect), captured
 * when the student comes back. PayPal doesn't support INR, so the fee is
 * charged in US dollars at PAYPAL_INR_PER_USD (a fixed test rate).
 */
const API = 'https://api-m.sandbox.paypal.com';
const creds = () => ({ id: env('PAYPAL_CLIENT_ID'), secret: env('PAYPAL_CLIENT_SECRET') });
const rate = () => Number(env('PAYPAL_INR_PER_USD')) || 85;

let token: { value: string; expires: number } | null = null;

async function accessToken() {
  if (token && token.expires > Date.now()) return token.value;
  const { id, secret } = creds();
  const t = await callGateway<{ access_token: string; expires_in: number }>('PayPal', `${API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  token = { value: t.access_token, expires: Date.now() + (t.expires_in - 60) * 1000 };
  return token.value;
}

async function call<T>(path: string, body?: object, requestId?: string) {
  return callGateway<T>('PayPal', `${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...(requestId && { 'PayPal-Request-Id': requestId }), // makes retries idempotent
    },
    body: body && JSON.stringify(body),
  });
}

interface Capture { id: string; status: string; amount: { currency_code: string; value: string } }
interface Order {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links?: { href: string; rel: string }[];
  purchase_units?: { payments?: { captures?: Capture[] } }[];
}

function fromOrder(o: Order): Status {
  const c = o.purchase_units?.[0]?.payments?.captures?.[0];
  if (o.status === 'COMPLETED' && c?.status === 'COMPLETED') {
    return { state: 'PAID', paymentId: c.id, method: 'paypal', amount: toMinor(c.amount.value), currency: c.amount.currency_code };
  }
  return { state: o.status === 'VOIDED' ? 'FAILED' : 'PENDING' };
}

export const paypal: Gateway = {
  id: 'paypal',
  configured: () => !!(creds().id && creds().secret),

  async start(i) {
    const cents = Math.max(1, Math.round(i.amount / rate())); // paise ÷ (₹ per $) = cents
    const o = await call<Order>(
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          { reference_id: i.attemptId, custom_id: i.attemptId, description: i.feeTitle.slice(0, 127), amount: { currency_code: 'USD', value: (cents / 100).toFixed(2) } },
        ],
        payment_source: {
          paypal: {
            experience_context: { return_url: i.returnUrl, cancel_url: i.cancelUrl, user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING', brand_name: i.collegeName.slice(0, 127) },
          },
        },
      },
      i.attemptId
    );
    const approve = o.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
    if (!approve) throw new FeeError('PayPal did not return an approval link.', 502);
    return { gatewayOrderId: o.id, checkout: { kind: 'redirect', url: approve }, charged: { amount: cents, currency: 'USD', rate: rate() } };
  },

  async status(a) {
    let o = await call<Order>(`/v2/checkout/orders/${a.gatewayOrderId}`);
    // Approved on PayPal's site but not yet charged: capture now.
    if (o.status === 'APPROVED') o = await call<Order>(`/v2/checkout/orders/${a.gatewayOrderId}/capture`, {}, `${a.id}-capture`);
    return fromOrder(o);
  },
};
