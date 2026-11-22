'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import type { FeePayment } from '@/types';
import { formatINR, PAYMENT_GATEWAYS } from '@/lib/rules';
import { Building, CheckCircle2, Printer, ReceiptText, X } from 'lucide-react';

const METHODS: Record<string, string> = { card: 'Card', cc: 'Card', dc: 'Card', creditcard: 'Card', debitcard: 'Card', upi: 'UPI', netbanking: 'Net banking', nb: 'Net banking', wallet: 'Wallet', ppi: 'Wallet', emi: 'EMI', paypal: 'PayPal balance' };

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100);

const paidOn = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Printable fee receipt. Uses the `report-dialog` print rules in globals.css,
 * so printing shows only the receipt, not the app behind it.
 */
export function ReceiptDialog({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const [payment, setPayment] = useState<FeePayment | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/payments/${paymentId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && setPayment(d.payment))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [paymentId]);

  if (!payment) {
    return (
      <Dialog open onClose={onClose} aria-label="Loading receipt">
        <output className="flex items-center gap-3 p-6 text-sm text-slate-600">
          {failed ? 'The receipt could not be loaded. Close this and try again.' : <><CircularProgress size={20} /> Loading receipt…</>}
        </output>
      </Dialog>
    );
  }

  const gateway = PAYMENT_GATEWAYS[payment.gateway].label;
  const method = METHODS[payment.method?.toLowerCase() ?? ''] ?? 'Online payment';
  const billedTo: [string, React.ReactNode][] = [
    ['Name', payment.studentName],
    ['Roll no.', payment.enrollmentNumber || '—'],
    ['Email', payment.studentEmail || '—'],
    ['Academic year', payment.academicYear || '—'],
  ];
  const paymentRows: [string, React.ReactNode][] = [
    ['Method', `${method} · ${gateway}`],
    ...(payment.chargedCurrency && payment.chargedAmount
      ? [['Charged', `${money(payment.chargedAmount, payment.chargedCurrency)} at ₹${payment.exchangeRate}/${payment.chargedCurrency} (test rate)`] as [string, React.ReactNode]]
      : []),
    ['Payment ID', <span key="p" className="font-mono text-xs">{payment.gatewayPaymentId || '—'}</span>],
    ['Order ID', <span key="o" className="font-mono text-xs">{payment.gatewayOrderId}</span>],
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      scroll="body"
      fullWidth
      maxWidth="sm"
      aria-labelledby="receipt-title"
      className="report-dialog"
      // Phones: MUI's default 32px margins leave a narrow receipt, so use 12px.
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            '@media (max-width: 599.95px)': { m: 1.5, width: 'calc(100% - 24px)', maxWidth: 'calc(100% - 24px)' },
          },
        },
      }}
    >
      {/* One wrapper: globals.css forces direct children of the paper to display:block when printing. */}
      <div>
        {/* Screen-only toolbar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 print:hidden">
          <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-700">
            <ReceiptText className="h-4 w-4 text-brand-600" aria-hidden />
            Fee receipt
          </span>
          <span className="flex items-center gap-1">
            <MuiButton variant="outlined" size="small" startIcon={<Printer size={14} />} onClick={() => window.print()}>
              Print or save PDF
            </MuiButton>
            <IconButton aria-label="Close receipt" onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
              <X size={18} />
            </IconButton>
          </span>
        </div>

        <article className="bg-white px-5 py-6 text-sm text-slate-800 sm:px-9 sm:py-8 [print-color-adjust:exact]">
          {/* Issuer, then what this document is */}
          <header>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden>
                <Building size={20} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-slate-900">{payment.collegeName}</p>
                {payment.departmentName && <p className="text-xs text-slate-500">{payment.departmentName}</p>}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-slate-200 pt-4">
              <h2 id="receipt-title" className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Payment receipt
              </h2>
              <p className="font-mono text-sm font-semibold text-slate-900">{payment.receiptNumber}</p>
            </div>
          </header>

          {/* Amount and status */}
          <section aria-label="Amount paid" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} aria-hidden />
                Paid
              </span>
              <span className="rounded-full border border-dashed border-amber-400 px-2.5 py-0.5 text-xs font-medium text-amber-700">Test mode</span>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatINR(payment.amount)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {paidOn(payment.paidAt!)} · {method} via {gateway}
            </p>
          </section>

          {/* Details */}
          <div className="mt-6 space-y-5">
            {([['Billed to', billedTo], ['Payment', paymentRows]] as const).map(([title, list]) => (
              <section key={title} aria-labelledby={`receipt-${title}`}>
                <h3 id={`receipt-${title}`} className="mb-2 text-2xs font-bold uppercase tracking-wider text-slate-500">
                  {title}
                </h3>
                <dl className="space-y-1.5">
                  {list.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 max-[400px]:grid-cols-1 max-[400px]:gap-0">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="break-words font-medium text-slate-800 [overflow-wrap:anywhere]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          {/* Line items */}
          <table className="mt-7 w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-left text-2xs uppercase tracking-wider text-slate-500">
                <th scope="col" className="pb-2 font-bold">Description</th>
                <th scope="col" className="pb-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 pr-4">
                  {payment.feeTitle}
                  {payment.academicYear && <span className="block text-xs text-slate-500">Academic year {payment.academicYear}</span>}
                </td>
                <td className="py-3 text-right tabular-nums">{formatINR(payment.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-3 text-left font-semibold">Total paid</th>
                <td className="pt-3 text-right text-base font-bold tabular-nums">{formatINR(payment.amount)}</td>
              </tr>
            </tfoot>
          </table>

          <footer className="mt-8 space-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <p>Computer-generated receipt; no signature needed. Payment confirmed with {gateway}.</p>
            <p className="text-amber-700">Test mode: no real money was charged.</p>
          </footer>
        </article>
      </div>
    </Dialog>
  );
}
