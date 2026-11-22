import { createHash } from 'node:crypto';
import { callGateway, env, rupees, SANDBOX_PHONE, toMinor, type Gateway } from './common';

/*
 * PayU India: hosted checkout. The browser posts a signed form to PayU's test
 * site; PayU posts the result back to our return URL, and we confirm it with
 * the verify_payment API rather than trusting the posted fields.
 */
const PAY_URL = 'https://test.payu.in/_payment';
const VERIFY_URL = 'https://test.payu.in/merchant/postservice?form=2';
const creds = () => ({ key: env('PAYU_KEY'), salt: env('PAYU_SALT') });
const sha512 = (s: string) => createHash('sha512').update(s).digest('hex');
/** A "|" inside a value would shift the hash fields, so strip it. */
const clean = (s: string, max: number) => s.replace(/\|/g, ' ').slice(0, max);

export const payu: Gateway = {
  id: 'payu',
  configured: () => !!(creds().key && creds().salt),

  async start(i) {
    const { key, salt } = creds();
    const f = {
      key,
      txnid: i.attemptId, // ≤ 25 characters
      amount: rupees(i.amount), // the exact same string goes in the hash
      productinfo: clean(i.feeTitle, 100),
      firstname: clean(i.student.name, 60),
      email: clean(i.student.email, 50),
      phone: SANDBOX_PHONE,
      surl: i.returnUrl,
      furl: i.returnUrl,
    };
    // sha512(key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT): 11 pipes after email when the udfs are empty.
    const hash = sha512(`${f.key}|${f.txnid}|${f.amount}|${f.productinfo}|${f.firstname}|${f.email}${'|'.repeat(11)}${salt}`);
    return { gatewayOrderId: f.txnid, checkout: { kind: 'form', action: PAY_URL, fields: { ...f, hash } } };
  },

  async status(a) {
    const { key, salt } = creds();
    const command = 'verify_payment';
    const res = await callGateway<{ transaction_details?: Record<string, { status: string; amt?: string; mihpayid?: string; mode?: string }> }>('PayU', VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({ key, command, var1: a.gatewayOrderId, hash: sha512(`${key}|${command}|${a.gatewayOrderId}|${salt}`) }),
    });
    const t = res.transaction_details?.[a.gatewayOrderId];
    if (t?.status === 'success') return { state: 'PAID', paymentId: t.mihpayid, method: t.mode?.toLowerCase(), amount: toMinor(t.amt ?? 0), currency: 'INR' };
    return { state: t?.status === 'failure' ? 'FAILED' : 'PENDING' }; // "Not Found" = not paid yet
  },
};
