import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FeePayment } from '@/types';
import { callGateway, env, FeeError, type Gateway, type Status } from './common';

// Razorpay: Standard Checkout popup. Test keys start with rzp_test_ (live keys are refused).
const API = 'https://api.razorpay.com/v1';
const keys = () => ({ id: env('RAZORPAY_KEY_ID'), secret: env('RAZORPAY_KEY_SECRET') });

function call<T>(path: string, body?: object) {
  const { id, secret } = keys();
  return callGateway<T>('Razorpay', `${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
}

interface RzpPayment { id: string; order_id: string; amount: number; currency: string; status: string; method?: string }

async function settle(p: RzpPayment): Promise<Status> {
  // Accounts capture automatically by default; capture here if this one doesn't,
  // otherwise Razorpay refunds an authorised payment after a few days.
  if (p.status === 'authorized') p = await call<RzpPayment>(`/payments/${p.id}/capture`, { amount: p.amount, currency: p.currency });
  if (p.status === 'captured') return { state: 'PAID', paymentId: p.id, method: p.method, amount: p.amount, currency: p.currency };
  return { state: p.status === 'failed' ? 'FAILED' : 'PENDING' };
}

export const razorpay: Gateway = {
  id: 'razorpay',
  configured: () => keys().id.startsWith('rzp_test_') && !!keys().secret,

  async start(i) {
    const order = await call<{ id: string }>('/orders', {
      amount: i.amount,
      currency: 'INR',
      receipt: i.attemptId, // ≤ 40 characters, unique
      notes: { attemptId: i.attemptId, studentId: i.student.id },
    });
    return {
      gatewayOrderId: order.id,
      checkout: { kind: 'razorpay', keyId: keys().id, orderId: order.id, amount: i.amount, currency: 'INR', name: i.collegeName, description: i.feeTitle, prefill: { name: i.student.name, email: i.student.email } },
    };
  },

  // The same order can be retried after a failed or abandoned attempt.
  resume: (a) => ({ kind: 'razorpay', keyId: keys().id, orderId: a.gatewayOrderId, amount: a.amount, currency: 'INR', name: a.collegeName, description: a.feeTitle, prefill: { name: a.studentName, email: a.studentEmail } }),

  async status(a) {
    const order = await call<{ status: 'created' | 'attempted' | 'paid' }>(`/orders/${a.gatewayOrderId}`);
    if (order.status !== 'paid') return { state: 'PENDING' };
    const { items } = await call<{ items: RzpPayment[] }>(`/orders/${a.gatewayOrderId}/payments`);
    const captured = items.find((p) => p.status === 'captured');
    return captured ? settle(captured) : { state: 'PENDING' };
  },
};

/**
 * What the Checkout popup hands back: HMAC-SHA256("<our order id>|<payment id>",
 * key secret) in hex. Checked against the order id we stored, then the payment
 * itself is fetched from Razorpay.
 */
export async function confirmRazorpay(a: FeePayment, paymentId: string, signature: string): Promise<Status> {
  const expected = createHmac('sha256', keys().secret).update(`${a.gatewayOrderId}|${paymentId}`).digest('hex');
  const got = Buffer.from(signature);
  const want = Buffer.from(expected);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    console.warn(`Razorpay signature mismatch for order ${a.gatewayOrderId} (student ${a.studentId}).`);
    throw new FeeError('This payment could not be verified. If money was deducted, contact the office with the payment ID.');
  }
  const payment = await call<RzpPayment>(`/payments/${paymentId}`);
  if (payment.order_id !== a.gatewayOrderId) throw new FeeError('The payment does not match this fee. Contact the office with the payment ID.');
  return settle(payment);
}
