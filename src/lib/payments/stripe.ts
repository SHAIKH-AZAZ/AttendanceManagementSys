import { callGateway, env, type Gateway } from './common';

// Stripe: hosted Checkout page (redirect). Test keys start with sk_test_ (live keys are refused).
const key = () => env('STRIPE_SECRET_KEY');

function call<T>(path: string, form?: Record<string, string>) {
  return callGateway<T>('Stripe', `https://api.stripe.com/v1${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${key()}:`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form && new URLSearchParams(form),
  });
}

interface Session {
  id: string;
  url: string | null;
  status: 'open' | 'complete' | 'expired';
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number;
  currency: string;
  payment_intent: string | null;
  payment_method_types?: string[];
}

export const stripe: Gateway = {
  id: 'stripe',
  configured: () => key().startsWith('sk_test_'),

  async start(i) {
    const s = await call<Session>('/checkout/sessions', {
      mode: 'payment',
      'line_items[0][price_data][currency]': 'inr',
      'line_items[0][price_data][unit_amount]': String(i.amount), // paise
      'line_items[0][price_data][product_data][name]': i.feeTitle,
      'line_items[0][quantity]': '1',
      success_url: i.returnUrl,
      cancel_url: i.cancelUrl,
      client_reference_id: i.attemptId,
      customer_email: i.student.email,
      'metadata[attemptId]': i.attemptId,
    });
    return { gatewayOrderId: s.id, checkout: { kind: 'redirect', url: s.url! } };
  },

  async status(a) {
    const s = await call<Session>(`/checkout/sessions/${a.gatewayOrderId}`);
    if (s.payment_status === 'paid') {
      return { state: 'PAID', paymentId: s.payment_intent ?? s.id, method: s.payment_method_types?.[0], amount: s.amount_total, currency: s.currency.toUpperCase() };
    }
    return { state: s.status === 'expired' ? 'FAILED' : 'PENDING' };
  },
};
