'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { Meta } from '@/hooks/useMeta';
import type { FeePayment } from '@/types';
import type { AdminFee } from '@/lib/services/fees';
import { formatINR, PAYMENT_GATEWAYS, todayIST } from '@/lib/rules';
import { Badge, Button, Card, DateInput, EmptyState, Modal, type NoticeTone, PageHeader, SelectField, formatDate } from '@/components/ui';
import { ReceiptDialog } from '@/components/fees/ReceiptDialog';
import { IndianRupee, ListChecks, Plus, ReceiptText, Trash2, Users } from 'lucide-react';

const ALL = 'ALL'; // SelectField needs a non-empty value for "everyone"
const RUPEES = /^\d{1,7}(\.\d{1,2})?$/;

type Payments = { paid: FeePayment[]; duplicates: FeePayment[]; unpaid: { studentId: string; fullName: string; enrollmentNumber: string }[] };

/** Office: publish fees, see who has paid, open any receipt. */
export function FeesAdminTab({ meta, notify }: { meta: Meta; notify: (n: { tone: NoticeTone; text: string }) => void }) {
  const [data, setData] = useState<{ fees: AdminFee[]; academicYears: string[] } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', departmentId: ALL, academicYear: ALL, dueDate: todayIST(), note: '' });
  const [amountError, setAmountError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AdminFee | null>(null);
  const [payments, setPayments] = useState<Payments | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/fees');
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const deptName = (id?: string) => (id ? meta.departments.find((d) => d.id === id)?.name ?? id : 'All departments');

  const openPayments = async (fee: AdminFee) => {
    setViewing(fee);
    setPayments(null);
    const res = await fetch(`/api/admin/fees/${fee.id}/payments`);
    if (res.ok) setPayments(await res.json());
  };

  const remove = async (fee: AdminFee) => {
    const res = await fetch(`/api/admin/fees/${fee.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    notify(res.ok ? { tone: 'success', text: `${fee.title} removed.` } : { tone: 'error', text: d.error || 'Could not remove the fee.' });
    load();
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!RUPEES.test(form.amount.trim())) {
      setAmountError(true);
      document.getElementById('fee-amount')?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          departmentId: form.departmentId === ALL ? undefined : form.departmentId,
          academicYear: form.academicYear === ALL ? undefined : form.academicYear,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save the fee.');
      setAddOpen(false);
      setForm({ ...form, title: '', amount: '', note: '' });
      notify({ tone: 'success', text: `${d.fee.title} published. Students it applies to have been notified.` });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fees = data?.fees ?? [];

  return (
    <>
      <PageHeader
        title="Fees"
        description="Publish fees for a department and academic year. Students pay online (Razorpay test mode) and get a receipt."
        actions={<Button variant="primary" icon={Plus} onClick={() => { setError(null); setAmountError(false); setAddOpen(true); }}>Add fee</Button>}
      />

      <Card padded={false}>
        {data === null ? (
          <output className="block p-5 text-sm text-slate-500">Loading fees…</output>
        ) : fees.length === 0 ? (
          <EmptyState icon={IndianRupee} title="No fees published" description="Add tuition, exam or other fees; students see them in their Fees tab." />
        ) : (
          <TableContainer component="section" tabIndex={0} sx={{ position: "relative" }} aria-label="Published fees">
            <Table size="small" sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2.5 }}>Fee</TableCell>
                  <TableCell>For</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Paid</TableCell>
                  <TableCell align="right">Collected</TableCell>
                  <TableCell><span className="sr-only">Actions</span></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fees.map((f) => (
                  <TableRow key={f.id} hover>
                    <TableCell sx={{ pl: 2.5 }}>
                      <span className="font-semibold text-slate-800">{f.title}</span>
                      {f.note && <span className="block text-xs text-slate-500">{f.note}</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deptName(f.departmentId)}
                      <span className="block text-xs text-slate-500">{f.academicYear ?? 'All years'}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(f.dueDate)}</TableCell>
                    <TableCell align="right" className="tabular-nums whitespace-nowrap">{formatINR(f.amount)}</TableCell>
                    <TableCell>
                      <Badge tone={f.expected && f.paidCount >= f.expected ? 'good' : f.paidCount ? 'info' : 'neutral'}>
                        {f.paidCount} / {f.expected}
                      </Badge>
                      {f.duplicates > 0 && <Badge tone="bad" className="ml-1">{f.duplicates} to refund</Badge>}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums whitespace-nowrap">{formatINR(f.collected)}</TableCell>
                    <TableCell align="right" className="whitespace-nowrap">
                      <Button size="sm" icon={ListChecks} onClick={() => openPayments(f)}>Payments</Button>
                      {f.paidCount === 0 && (
                        <IconButton aria-label={`Remove ${f.title}`} onClick={() => remove(f)}>
                          <Trash2 size={16} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        icon={IndianRupee}
        title="Add fee"
        description="Students it applies to are notified and can pay right away."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="add-fee" loading={busy}>Publish fee</Button>
          </>
        }
      >
        <form id="add-fee" className="grid sm:grid-cols-2 gap-4 pt-1" onSubmit={submit}>
          <div className="sm:col-span-2">
            <TextField
              id="fee-title"
              name="title"
              label="Fee name"
              required
              fullWidth
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Tuition fee, odd term 2026-27"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 100 } }}
            />
          </div>
          <TextField
            id="fee-amount"
            name="amount"
            label="Amount"
            required
            value={form.amount}
            onChange={(e) => {
              setForm({ ...form, amount: e.target.value });
              if (amountError && RUPEES.test(e.target.value.trim())) setAmountError(false); // clear once fixed, don't nag while typing
            }}
            onBlur={() => form.amount && setAmountError(!RUPEES.test(form.amount.trim()))}
            error={amountError}
            helperText={amountError ? 'Enter rupees, up to 2 decimals (e.g. 45000 or 1250.50).' : 'In rupees, e.g. 45000'}
            placeholder="45000"
            slotProps={{
              inputLabel: { shrink: true },
              input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
              htmlInput: { inputMode: 'decimal', enterKeyHint: 'next', pattern: '\\d{1,7}(\\.\\d{1,2})?', autoComplete: 'off' },
            }}
          />
          <DateInput id="fee-due" label="Due date" required value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
          <SelectField
            id="fee-dept"
            label="Department"
            value={form.departmentId}
            onChange={(v) => setForm({ ...form, departmentId: v })}
            options={[{ value: ALL, label: 'All departments' }, ...meta.departments.map((d) => ({ value: d.id, label: d.name }))]}
          />
          <SelectField
            id="fee-year"
            label="Academic year"
            value={form.academicYear}
            onChange={(v) => setForm({ ...form, academicYear: v })}
            options={[{ value: ALL, label: 'All years' }, ...(data?.academicYears ?? []).map((y) => ({ value: y, label: y }))]}
            helperText="Years that students are enrolled in."
          />
          <div className="sm:col-span-2">
            <TextField
              id="fee-note"
              name="note"
              label="Note (optional)"
              fullWidth
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Includes library and lab charges"
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 300 } }}
            />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-rose-600" role="alert">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        icon={Users}
        title={viewing?.title ?? 'Payments'}
        description={viewing && `${formatINR(viewing.amount)} · due ${formatDate(viewing.dueDate)}`}
        size="lg"
      >
        {!payments ? (
          <output className="block text-sm text-slate-500">Loading payments…</output>
        ) : (
          <div className="space-y-5">
            <section aria-labelledby="paid-heading">
              <h3 id="paid-heading" className="text-sm font-bold text-slate-800 mb-2">Paid ({payments.paid.length})</h3>
              {payments.paid.length === 0 ? (
                <p className="text-sm text-slate-500">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border-y border-slate-200">
                  {payments.paid.map((p) => (
                    <li key={p.id} className="py-2.5 flex items-center gap-3">
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold text-slate-800">{p.studentName}</span>
                        <span className="block text-xs text-slate-500">
                          {p.enrollmentNumber} · {formatDate(p.paidAt!)} · {PAYMENT_GATEWAYS[p.gateway].label} · <span className="font-mono">{p.receiptNumber}</span>
                        </span>
                      </span>
                      <Button size="sm" icon={ReceiptText} onClick={() => setReceiptId(p.id)}>Receipt</Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {payments.duplicates.length > 0 && (
              <section aria-labelledby="dup-heading">
                <h3 id="dup-heading" className="text-sm font-bold text-rose-700 mb-1">Paid twice: refund needed ({payments.duplicates.length})</h3>
                <p className="text-xs text-slate-500 mb-2">These students paid again after the fee was already paid. Refund each payment from that gateway’s dashboard.</p>
                <ul className="divide-y divide-slate-100 border-y border-slate-200">
                  {payments.duplicates.map((p) => (
                    <li key={p.id} className="py-2 text-sm">
                      <span className="text-slate-800">{p.studentName}</span>
                      <span className="block text-xs text-slate-500">
                        {PAYMENT_GATEWAYS[p.gateway].label} · payment <span className="font-mono">{p.gatewayPaymentId}</span> · {p.paidAt && formatDate(p.paidAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="unpaid-heading">
              <h3 id="unpaid-heading" className="text-sm font-bold text-slate-800 mb-2">Not paid yet ({payments.unpaid.length})</h3>
              {payments.unpaid.length === 0 ? (
                <p className="text-sm text-slate-500">Everyone has paid.</p>
              ) : (
                <ul className="divide-y divide-slate-100 border-y border-slate-200">
                  {payments.unpaid.map((s) => (
                    <li key={s.studentId} className="py-2 text-sm">
                      <span className="text-slate-800">{s.fullName}</span>
                      <span className="text-xs text-slate-500"> · {s.enrollmentNumber}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>

      {receiptId && <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </>
  );
}
