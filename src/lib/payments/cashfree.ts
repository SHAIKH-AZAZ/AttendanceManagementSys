import { callGateway, env, rupees, SANDBOX_PHONE, toMinor, type Gateway } from './common';

// Cashfree: order created here, checkout opened with Cashfree's JS SDK (sandbox mode).
const API = 'https://sandbox.cashfree.com/pg';
const creds = () => ({ id: env('CASHFREE_APP_ID'), secret: env('CASHFREE_SECRET_KEY') });

function call<T>(path: string, body?: object) {
  const { id, secret } = creds();
  return callGateway<T>('Cashfree', `${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-client-id': id, 'x-client-secret': secret, 'x-api-version': '2025-01-01', 'Content-Type': 'application/json', accept: 'application/json' },
    body: body && JSON.stringify(body),
  });
}

interface Order { order_id: string; order_status: string; order_amount: number; order_currency: string; payment_session_id?: string }
interface Payment { cf_payment_id: number | string; payment_status: string; payment_amount: number; payment_group?: string }

export const cashfree: Gateway = {
  id: 'cashfree',
  configured: () => !!(creds().id && creds().secret),

  async start(i) {
    const o = await call<Order>('/orders', {
      order_id: i.attemptId,
      order_amount: Number(rupees(i.amount)),
      order_currency: 'INR',
      customer_details: {
        customer_id: `s${i.student.id.replace(/[^a-zA-Z0-9]/g, '')}`.slice(0, 50), // alphanumeric only
        customer_name: i.student.name.slice(0, 100),
        customer_email: i.student.email,
        customer_phone: SANDBOX_PHONE,
      },
      order_meta: { return_url: i.returnUrl },
      order_note: i.feeTitle.slice(0, 200),
    });
    return { gatewayOrderId: o.order_id, checkout: { kind: 'cashfree', paymentSessionId: o.payment_session_id! } };
  },

  async status(a) {
    const o = await call<Order>(`/orders/${a.gatewayOrderId}`);
    if (o.order_status === 'PAID') {
      const payments = await call<Payment[]>(`/orders/${a.gatewayOrderId}/payments`).catch(() => [] as Payment[]);
      const p = payments.find((x) => x.payment_status === 'SUCCESS');
      return { state: 'PAID', paymentId: p ? String(p.cf_payment_id) : o.order_id, method: p?.payment_group, amount: toMinor(o.order_amount), currency: o.order_currency };
    }
    return { state: ['EXPIRED', 'TERMINATED'].includes(o.order_status) ? 'FAILED' : 'PENDING' };
  },
};
