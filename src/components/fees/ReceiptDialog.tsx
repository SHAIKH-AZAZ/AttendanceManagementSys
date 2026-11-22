'use client';

import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import type { FeePayment } from '@/types';
import { formatINR, PAYMENT_GATEWAYS } from '@/lib/rules';
import { Building, Printer, ReceiptText, X } from 'lucide-react';

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

  const rows: [string, React.ReactNode][] = [
    ['Student', payment.studentName],
    ['Roll no.', payment.enrollmentNumber || '—'],
    ['Email', payment.studentEmail || '—'],
    ['Academic year', payment.academicYear || '—'],
    ['Paid on', paidOn(payment.paidAt!)],
    ['Payment method', `${METHODS[payment.method?.toLowerCase() ?? ''] ?? 'Online'} via ${PAYMENT_GATEWAYS[payment.gateway].label}`],
    ...(payment.chargedCurrency && payment.chargedAmount
      ? [['Charged', `${money(payment.chargedAmount, payment.chargedCurrency)} (₹${payment.exchangeRate} per ${payment.chargedCurrency}, test rate)`] as [string, React.ReactNode]]
      : []),
    ['Payment ID', <span key="p" className="font-mono">{payment.gatewayPaymentId}</span>],
    ['Order ID', <span key="o" className="font-mono">{payment.gatewayOrderId}</span>],
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
      slotProps={{ paper: { sx: { borderRadius: 4, overflow: 'hidden' } } }}
    >
      <div className="flex flex-col">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <ReceiptText className="w-4 h-4 text-emerald-400" aria-hidden />
            Fee receipt
          </div>
          <div className="flex items-center gap-2">
            <MuiButton variant="contained" size="small" startIcon={<Printer size={14} />} onClick={() => window.print()}>
              Print / Save as PDF
            </MuiButton>
            <IconButton aria-label="Close receipt" onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#fff' } }}>
              <X size={20} />
            </IconButton>
          </div>
        </div>

        <article className="relative p-8 sm:p-10 space-y-6 text-sm bg-white text-slate-900">
          <header className="border-b-2 border-slate-900 pb-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Building className="w-6 h-6 text-slate-800" aria-hidden />
              <p className="text-lg font-serif font-bold uppercase tracking-wide">{payment.collegeName}</p>
            </div>
            {payment.departmentName && <p className="text-xs font-serif text-slate-600">{payment.departmentName}</p>}
            <h2 id="receipt-title" className="mt-3 text-base font-bold uppercase tracking-widest">Fee payment receipt</h2>
          </header>

          <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600">
            <span>Receipt no. <strong className="font-mono text-slate-900">{payment.receiptNumber}</strong></span>
            <span className="rounded border border-amber-500 px-2 py-0.5 font-bold uppercase tracking-wider text-amber-700">
              Test mode · no real money
            </span>
          </div>

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            {rows.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium break-all">{v}</dd>
              </React.Fragment>
            ))}
          </dl>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y border-slate-300 text-left text-xs uppercase tracking-wider text-slate-500">
                <th scope="col" className="py-2 font-semibold">Description</th>
                <th scope="col" className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3">{payment.feeTitle}</td>
                <td className="py-3 text-right tabular-nums">{formatINR(payment.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-3 text-left">Total paid</th>
                <td className="pt-3 text-right text-base font-bold tabular-nums">{formatINR(payment.amount)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            Computer-generated receipt; no signature needed. Payment confirmed with {PAYMENT_GATEWAYS[payment.gateway].label}.
          </p>
        </article>
      </div>
    </Dialog>
  );
}
