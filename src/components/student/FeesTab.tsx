'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { PaymentGatewayId } from '@/types';
import type { StudentFee, OrderResult, ReturnOutcome } from '@/lib/services/fees';
import type { Checkout } from '@/lib/payments/common';
import { formatINR, PAYMENT_GATEWAYS, todayIST } from '@/lib/rules';
import { Badge, Button, Card, EmptyState, Modal, Notice, type NoticeTone, PageHeader, StatCard, formatDate } from '@/components/ui';
import { ReceiptDialog } from '@/components/fees/ReceiptDialog';
import { CheckCircle2, CreditCard, IndianRupee, ReceiptText, Wallet } from 'lucide-react';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/* ------------------------------------------------------ Gateway checkout scripts */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: new (options: object) => { open(): void; on(event: string, cb: (r: any) => void): void };
    Cashfree?: (o: { mode: 'sandbox' | 'production' }) => { checkout(o: object): Promise<any> };
    Paytm?: { CheckoutJS: { onLoad(cb: () => void): void; init(config: object): Promise<void>; invoke(): void } };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const scripts = new Map<string, Promise<void>>();
/**
 * Loads a gateway's checkout script once, on demand. These URLs are updated in
 * place by the gateways, so they can't carry Subresource Integrity hashes.
 */
function loadScript(src: string, priority: 'low' | 'auto' = 'auto'): Promise<void> {
  if (!scripts.has(src)) {
    scripts.set(
      src,
      new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.fetchPriority = priority;
        s.onload = () => resolve();
        s.onerror = () => {
          scripts.delete(src); // allow a retry
          s.remove();
          reject(new Error('Could not load the payment window. Check your connection and try again.'));
        };
        document.head.append(s);
      })
    );
  }
  return scripts.get(src)!;
}

const SCRIPT: Partial<Record<PaymentGatewayId, string>> = {
  razorpay: 'https://checkout.razorpay.com/v1/checkout.js',
  cashfree: 'https://sdk.cashfree.com/js/v3/cashfree.js',
};

/** Post a hidden form (PayU's hosted checkout is opened this way). */
function postForm(action: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}

/* ----------------------------------------------------------------------- Tab */

const RETURN_NOTICES: Record<ReturnOutcome['outcome'], { tone: NoticeTone; text: string } | null> = {
  paid: null,
  pending: { tone: 'info', text: 'The gateway is still confirming your payment. It will show as paid here once confirmed; check again in a few minutes.' },
  failed: { tone: 'error', text: 'The payment failed and no money was taken. Try again, or choose another payment method.' },
  cancelled: { tone: 'warn', text: 'Payment cancelled. You can pay whenever you’re ready.' },
  duplicate: { tone: 'warn', text: 'This fee was already paid, so that extra payment will be refunded. The office has been told.' },
  error: { tone: 'error', text: 'We couldn’t confirm that payment. If money was deducted, contact the office with the payment ID from the gateway’s email.' },
};

function feeStatus(f: StudentFee) {
  if (f.paymentId) return { label: 'Paid', tone: 'good' as const, icon: CheckCircle2 };
  if (f.dueDate < todayIST()) return { label: 'Overdue', tone: 'bad' as const, icon: undefined };
  return { label: 'Due', tone: 'warn' as const, icon: undefined };
}

async function postJSON<T>(url: string, body: object = {}): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data as T;
}

export function StudentFeesTab({ notify }: { notify: (n: { tone: NoticeTone; text: string }) => void }) {
  const [data, setData] = useState<{ fees: StudentFee[]; gateways: PaymentGatewayId[] } | null>(null);
  const [paying, setPaying] = useState<StudentFee | null>(null); // fee whose method picker is open
  const [choice, setChoice] = useState<PaymentGatewayId | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/student/fees');
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
    // Back from a gateway's page via the browser's Back button: the page comes
    // back from the back/forward cache mid-payment, so unlock it and refresh.
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setBusy(false);
      setPaying(null);
      load();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [load]);

  // Back from a gateway's page: show the receipt or what happened, then tidy the URL.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const receipt = q.get('receipt');
    const outcome = q.get('payment') as ReturnOutcome['outcome'] | null;
    if (receipt) {
      notify({ tone: 'success', text: 'Payment received. Here is your receipt.' });
      setReceiptId(receipt);
    } else if (outcome && RETURN_NOTICES[outcome]) {
      notify(RETURN_NOTICES[outcome]!);
    }
    if (q.size) window.history.replaceState(null, '', window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once, on arrival

  const done = (paymentId: string, text: string) => {
    setBusy(false);
    setPaying(null);
    notify({ tone: 'success', text });
    load();
    setReceiptId(paymentId);
  };
  const fail = (e: unknown) => {
    setBusy(false);
    notify({ tone: 'error', text: (e as Error).message });
  };

  const choose = (g: PaymentGatewayId) => {
    setChoice(g);
    if (SCRIPT[g]) loadScript(SCRIPT[g]!, 'low').catch(() => {}); // warm up; errors resurface on "Pay"
  };

  const openPicker = (fee: StudentFee) => {
    setPaying(fee);
    const gateways = data?.gateways ?? [];
    if (gateways.length) choose(choice && gateways.includes(choice) ? choice : gateways[0]);
  };

  /** Open the checkout the server prepared for the chosen gateway. */
  const openCheckout = async (attemptId: string, c: Checkout) => {
    switch (c.kind) {
      case 'redirect':
        window.location.assign(c.url);
        return;
      case 'form':
        postForm(c.action, c.fields);
        return;
      case 'cashfree':
        await loadScript(SCRIPT.cashfree!);
        await window.Cashfree!({ mode: 'sandbox' }).checkout({ paymentSessionId: c.paymentSessionId, redirectTarget: '_self' });
        return;
      case 'paytm':
        await loadScript(`${c.host}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(c.mid)}.js`);
        window.Paytm!.CheckoutJS.onLoad(() => {
          window.Paytm!.CheckoutJS.init({
            root: '',
            flow: 'DEFAULT',
            data: { orderId: c.orderId, token: c.token, tokenType: 'TXN_TOKEN', amount: c.amount },
            merchant: { redirect: true }, // Paytm posts the result to our return URL
            handler: {
              notifyMerchant: (event: string) => event === 'APP_CLOSED' && setBusy(false),
              // Fallback if Paytm reports in-page instead of redirecting: the server checks with Paytm.
              transactionStatus: () => window.location.assign(`/api/payments/return/paytm?attempt=${attemptId}`),
            },
          })
            .then(() => window.Paytm!.CheckoutJS.invoke())
            .catch(fail);
        });
        return;
      case 'razorpay': {
        await loadScript(SCRIPT.razorpay!);
        const rzp = new window.Razorpay!({
          key: c.keyId,
          order_id: c.orderId,
          amount: c.amount,
          currency: c.currency,
          name: c.name,
          description: c.description,
          prefill: c.prefill,
          theme: { color: '#1D4ED8' },
          handler: async (r: object) => {
            try {
              const { payment } = await postJSON<{ payment: { id: string; receiptNumber: string } }>('/api/student/payments/verify', r);
              done(payment.id, `Payment received. Receipt ${payment.receiptNumber}.`);
            } catch (e) {
              fail(e);
            }
          },
          modal: { ondismiss: () => setBusy(false) },
        });
        rzp.on('payment.failed', (r: { error: { description?: string } }) => notify({ tone: 'error', text: `Payment failed: ${r.error.description ?? 'please try again'}.` }));
        setPaying(null); // the popup takes over
        rzp.open();
        return;
      }
    }
  };

  const pay = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!paying || !choice) return;
    setBusy(true); // also blocks a second click from starting another attempt
    try {
      const order = await postJSON<OrderResult>(`/api/student/fees/${paying.id}/order`, { gateway: choice });
      if (order.alreadyPaid) return done(order.paymentId, 'This fee is already paid. Here is your receipt.');
      await openCheckout(order.attemptId, order.checkout);
    } catch (e) {
      fail(e);
    }
  };

  const fees = data?.fees;
  const gateways = data?.gateways ?? [];
  const unpaid = fees?.filter((f) => !f.paymentId) ?? [];
  const dueTotal = unpaid.reduce((s, f) => s + f.amount, 0);
  const paidTotal = (fees ?? []).filter((f) => f.paymentId).reduce((s, f) => s + f.amount, 0);
  const canPay = !DEMO && gateways.length > 0;

  return (
    <>
      <PageHeader title="Fees" description="Pay your college fees online and download receipts." />

      {DEMO ? (
        <Notice tone="info" className="mb-5">Online payment is turned off in the public demo. Fees and receipts are shown read-only.</Notice>
      ) : data && gateways.length === 0 ? (
        <Notice tone="info" className="mb-5">Online payment isn’t set up yet. Contact the office to pay your fees.</Notice>
      ) : (
        <Notice tone="warn" className="mb-5">Test mode: no real money is charged. Each payment method shows the test details to use.</Notice>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <StatCard label="Due now" value={formatINR(dueTotal)} hint={`${unpaid.length} fee${unpaid.length === 1 ? '' : 's'} to pay`} tone={unpaid.length ? 'warn' : 'good'} icon={Wallet} />
        <StatCard label="Paid" value={formatINR(paidTotal)} hint="Receipts below" tone="good" icon={IndianRupee} />
      </div>

      <Card padded={false}>
        {!fees ? (
          <output className="block p-5 text-sm text-slate-500">Loading fees…</output>
        ) : fees.length === 0 ? (
          <EmptyState icon={ReceiptText} title="No fees yet" description="Fees published by the office will appear here." />
        ) : (
          <TableContainer component="section" tabIndex={0} sx={{ position: 'relative' }} aria-label="Your fees">
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2.5 }}>Fee</TableCell>
                  <TableCell>Due date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" sx={{ pr: 2.5 }}><span className="sr-only">Action</span></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fees.map((f) => {
                  const st = feeStatus(f);
                  return (
                    <TableRow key={f.id} hover>
                      <TableCell sx={{ pl: 2.5 }}>
                        <span className="font-semibold text-slate-800">{f.title}</span>
                        {f.note && <span className="block text-xs text-slate-500">{f.note}</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(f.dueDate)}</TableCell>
                      <TableCell align="right" className="tabular-nums whitespace-nowrap">{formatINR(f.amount)}</TableCell>
                      <TableCell>
                        <Badge tone={st.tone} icon={st.icon}>{st.label}</Badge>
                        {f.paidAt && <span className="block text-xs text-slate-500 mt-0.5">{formatDate(f.paidAt)}</span>}
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2.5 }} className="whitespace-nowrap">
                        {f.paymentId ? (
                          <Button size="sm" icon={ReceiptText} onClick={() => setReceiptId(f.paymentId!)}>Receipt</Button>
                        ) : canPay ? (
                          <Button size="sm" variant="primary" icon={CreditCard} disabled={busy} onClick={() => openPicker(f)}>
                            Pay {formatINR(f.amount)}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">{DEMO ? 'Paying is off in the demo' : 'Pay at the office'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Modal
        open={!!paying}
        onClose={() => !busy && setPaying(null)}
        icon={CreditCard}
        title="Choose how to pay"
        description={paying && `${paying.title} · ${formatINR(paying.amount)}`}
        size="lg"
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setPaying(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="pay-fee" loading={busy} disabled={!choice}>
              Pay {paying && formatINR(paying.amount)}{choice && ` with ${PAYMENT_GATEWAYS[choice].label}`}
            </Button>
          </>
        }
      >
        <form id="pay-fee" onSubmit={pay}>
          <fieldset className="grid gap-2.5">
            <legend className="sr-only">Payment method</legend>
            {gateways.map((g) => (
              <label
                key={g}
                className="grid grid-cols-[auto_1fr] items-start gap-x-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-slate-300 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/60"
              >
                <input type="radio" name="gateway" value={g} required checked={choice === g} onChange={() => choose(g)} className="mt-1 size-4 accent-blue-700" />
                <span className="font-semibold text-slate-800">{PAYMENT_GATEWAYS[g].label}</span>
                <span className="col-start-2 text-xs text-slate-500">{PAYMENT_GATEWAYS[g].hint}</span>
              </label>
            ))}
          </fieldset>
        </form>
      </Modal>

      {receiptId && <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
}
