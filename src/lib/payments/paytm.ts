import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { callGateway, env, FeeError, rupees, toMinor, type Gateway } from './common';

/*
 * Paytm: transaction token created here, payment page opened with Paytm's
 * JS Checkout on the staging host. Paytm posts the result to our return URL;
 * we confirm it with the Transaction Status API.
 */
const CHECKOUT_HOST = 'https://securestage.paytmpayments.com';
const STATUS_URL = 'https://securegw-stage.paytmpayments.in/v3/order/status';
const creds = () => ({ mid: env('PAYTM_MID'), key: env('PAYTM_MERCHANT_KEY'), website: env('PAYTM_WEBSITE') || 'WEBSTAGING' });

/**
 * Paytm's request signature, same algorithm as their official PaytmChecksum
 * library: AES-128-CBC( sha256("<body>|<salt>") hex + salt ), fixed IV, base64.
 */
export function paytmSignature(body: string, key: string, salt = randomBytes(3).toString('base64')) {
  const hash = createHash('sha256').update(`${body}|${salt}`).digest('hex') + salt;
  const cipher = createCipheriv('aes-128-cbc', key, '@@@@&&&&####$$$$');
  return cipher.update(hash, 'binary', 'base64') + cipher.final('base64');
}

async function signedPost<T>(url: string, body: object) {
  const json = JSON.stringify(body); // signed and sent as the same string
  return callGateway<T>('Paytm', url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: `{"body":${json},"head":{"signature":"${paytmSignature(json, creds().key)}"}}`,
  });
}

interface ResultInfo { resultStatus: string; resultMsg?: string }

export const paytm: Gateway = {
  id: 'paytm',
  configured: () => !!(creds().mid && creds().key),

  async start(i) {
    const { mid, key, website } = creds();
    if (Buffer.byteLength(key) !== 16) throw new FeeError('Paytm: PAYTM_MERCHANT_KEY must be the 16-character staging key.', 503);
    const amount = rupees(i.amount);
    const res = await signedPost<{ body: { resultInfo: ResultInfo; txnToken?: string } }>(
      `${CHECKOUT_HOST}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(i.attemptId)}`,
      { requestType: 'Payment', mid, websiteName: website, orderId: i.attemptId, callbackUrl: i.returnUrl, txnAmount: { value: amount, currency: 'INR' }, userInfo: { custId: i.student.id } }
    );
    if (res.body.resultInfo.resultStatus !== 'S' || !res.body.txnToken) {
      throw new FeeError(`Paytm: ${res.body.resultInfo.resultMsg || 'could not start the payment'}`, 502);
    }
    return { gatewayOrderId: i.attemptId, checkout: { kind: 'paytm', host: CHECKOUT_HOST, mid, orderId: i.attemptId, token: res.body.txnToken, amount } };
  },

  async status(a) {
    const res = await signedPost<{ body: { resultInfo: ResultInfo; txnId?: string; txnAmount?: string; paymentMode?: string } }>(STATUS_URL, { mid: creds().mid, orderId: a.gatewayOrderId });
    const b = res.body;
    if (b.resultInfo.resultStatus === 'TXN_SUCCESS') return { state: 'PAID', paymentId: b.txnId, method: b.paymentMode?.toLowerCase(), amount: toMinor(b.txnAmount ?? 0), currency: 'INR' };
    return { state: b.resultInfo.resultStatus === 'TXN_FAILURE' ? 'FAILED' : 'PENDING' };
  },
};
