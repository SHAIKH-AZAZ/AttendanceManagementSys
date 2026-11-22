import { randomBytes } from 'node:crypto';
import type { Fee, FeePayment, PaymentGatewayId, User } from '@/types';
import { CampusModel, DepartmentModel, FeeModel, FeePaymentModel, UserModel } from '@/models';
import { formatINR, PAYMENT_GATEWAYS, todayIST } from '@/lib/rules';
import { confirmRazorpay, configuredGateways, FeeError, GATEWAYS, isGatewayId, type Checkout, type Status } from '@/lib/payments';
import { connectToDatabase } from '../mongodb';
import { dbService } from '../db-service';
import { notify } from './notifications';

export { FeeError };

/*
 * Fees and online payment (test mode only, several gateways).
 *
 * Flow: the office publishes a fee → a student picks a gateway and gets a
 * checkout for an amount set here, never by the browser → the gateway takes
 * the payment → we ask the gateway ourselves whether it was paid, then issue
 * the receipt. Each try is a separate attempt record; only one can be PAID.
 */

const newId = (p: string) => `${p}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const out = <T>(d: any): T => {
  const { _id, ...rest } = d;
  return { id: _id, ...rest } as T;
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Rupees with up to two decimals, e.g. "45000" or "1250.50". */
const RUPEES = /^\d{1,7}(\.\d{1,2})?$/;
const MIN_PAISE = 100; // ₹1, the lowest minimum among the gateways
const MAX_PAISE = 10_00_000 * 100; // ₹10 lakh: well above any single fee
const ATTEMPT_ID = /^pay-[0-9a-z]+-[0-9a-f]{6}$/;
/** How far back unfinished attempts are re-checked before starting a new one. */
const RECHECK_MS = 3 * 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ Who pays */

const appliesTo = (fee: Fee, s: User) =>
  (!fee.departmentId || fee.departmentId === s.departmentId) &&
  (!fee.academicYear || fee.academicYear === s.studentProfile?.academicYear);

const studentFilter = (fee: Pick<Fee, 'departmentId' | 'academicYear'>) => ({
  role: 'STUDENT' as const,
  isActive: true,
  ...(fee.departmentId && { departmentId: fee.departmentId }),
  ...(fee.academicYear && { 'studentProfile.academicYear': fee.academicYear }),
});

/* --------------------------------------------------------------- Office side */

export type AdminFee = Fee & { expected: number; paidCount: number; collected: number; duplicates: number };

/** All fees with how many students owe and have paid each, plus the academic years students have. */
export async function listFeesForAdmin(): Promise<{ fees: AdminFee[]; academicYears: string[] }> {
  await connectToDatabase();
  const [fees, totals, years] = await Promise.all([
    FeeModel.find().sort({ dueDate: -1 }).lean(),
    FeePaymentModel.aggregate<{ _id: { feeId: string; status: string }; n: number; sum: number }>([
      { $match: { status: { $in: ['PAID', 'DUPLICATE'] } } },
      { $group: { _id: { feeId: '$feeId', status: '$status' }, n: { $sum: 1 }, sum: { $sum: '$amount' } } },
    ]),
    UserModel.distinct('studentProfile.academicYear', { role: 'STUDENT' }),
  ]);
  const total = (feeId: string, status: string) => totals.find((t) => t._id.feeId === feeId && t._id.status === status);
  const withCounts = await Promise.all(
    fees.map(async (f) => ({
      ...out<Fee>(f),
      expected: await UserModel.countDocuments(studentFilter(f)),
      paidCount: total(f._id, 'PAID')?.n ?? 0,
      collected: total(f._id, 'PAID')?.sum ?? 0,
      duplicates: total(f._id, 'DUPLICATE')?.n ?? 0,
    }))
  );
  return { fees: withCounts, academicYears: (years as string[]).filter(Boolean).sort() };
}

export async function createFee(
  user: User,
  b: { title?: unknown; amount?: unknown; departmentId?: unknown; academicYear?: unknown; dueDate?: unknown; note?: unknown }
): Promise<Fee> {
  await connectToDatabase();
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 100) throw new FeeError('Enter a fee name (up to 100 characters).');
  const rupees = String(b.amount ?? '').trim();
  const amount = RUPEES.test(rupees) ? Math.round(Number(rupees) * 100) : NaN;
  if (!(amount >= MIN_PAISE && amount <= MAX_PAISE)) throw new FeeError('Enter an amount between ₹1 and ₹10,00,000 (up to 2 decimals).');
  const dueDate = String(b.dueDate ?? '');
  if (!DATE.test(dueDate)) throw new FeeError('Enter a valid due date.');
  const departmentId = typeof b.departmentId === 'string' && b.departmentId ? b.departmentId : undefined;
  const department = departmentId ? await DepartmentModel.findById(departmentId).lean() : null;
  if (departmentId && !department) throw new FeeError('Department not found.');
  const academicYear = typeof b.academicYear === 'string' && b.academicYear.trim() ? b.academicYear.trim().slice(0, 20) : undefined;

  const fee: Fee = {
    id: newId('fee'),
    title,
    amount,
    departmentId,
    academicYear,
    dueDate,
    note: typeof b.note === 'string' && b.note.trim() ? b.note.trim().slice(0, 300) : undefined,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };
  const { id: _id, ...rest } = fee;
  await FeeModel.create({ _id, ...rest });

  const students = await UserModel.find(studentFilter(fee), { _id: 1 }).lean();
  await notify(
    students.map((s) => s._id),
    { title: `Fee due: ${title}`, body: `${formatINR(amount)} by ${dueDate}. Pay online from the Fees tab.`, tab: 'student-fees' }
  );
  await dbService.addSystemAudit({
    userId: user.id,
    userName: user.fullName,
    action: 'FEE_CREATED',
    entityName: 'Fee',
    entityId: fee.id,
    details: `${title}: ${formatINR(amount)}, due ${dueDate}, for ${department?.name ?? 'all departments'}${academicYear ? ` (${academicYear})` : ''}. ${students.length} students notified.`,
  });
  return fee;
}

/** Remove a fee nobody has paid yet. Unfinished attempts are kept so a payment already in progress can still be confirmed. */
export async function removeFee(user: User, id: string) {
  await connectToDatabase();
  if (await FeePaymentModel.exists({ feeId: id, status: { $in: ['PAID', 'DUPLICATE'] } })) {
    throw new FeeError('Students have already paid this fee, so it can’t be removed.', 409);
  }
  const fee = await FeeModel.findByIdAndDelete(id).lean();
  if (!fee) throw new FeeError('Fee not found.', 404);
  await dbService.addSystemAudit({ userId: user.id, userName: user.fullName, action: 'FEE_REMOVED', entityName: 'Fee', entityId: id, details: `Removed ${fee.title}` });
}

/** Who has paid a fee (with receipts), who paid twice (refund due), and who hasn't paid yet. */
export async function feePayments(id: string) {
  await connectToDatabase();
  const fee = await FeeModel.findById(id).lean();
  if (!fee) throw new FeeError('Fee not found.', 404);
  const [settled, students] = await Promise.all([
    FeePaymentModel.find({ feeId: id, status: { $in: ['PAID', 'DUPLICATE'] } }).sort({ paidAt: -1 }).lean(),
    UserModel.find(studentFilter(fee), { fullName: 1, studentProfile: 1 }).sort({ fullName: 1 }).lean(),
  ]);
  const paid = settled.filter((p) => p.status === 'PAID');
  const paidIds = new Set(paid.map((p) => p.studentId));
  return {
    paid: paid.map((p) => out<FeePayment>(p)),
    duplicates: settled.filter((p) => p.status === 'DUPLICATE').map((p) => out<FeePayment>(p)),
    unpaid: students
      .filter((s) => !paidIds.has(s._id))
      .map((s) => ({ studentId: s._id, fullName: s.fullName, enrollmentNumber: s.studentProfile?.enrollmentNumber ?? '' })),
  };
}

/* -------------------------------------------------------------- Student side */

export type StudentFee = Fee & { paymentId?: string; receiptNumber?: string; paidAt?: string };

/** Fees that apply to this student (paid ones with receipts), and the gateways they can pay through. */
export async function listFeesForStudent(student: User): Promise<{ fees: StudentFee[]; gateways: PaymentGatewayId[] }> {
  await connectToDatabase();
  const [fees, paid] = await Promise.all([
    FeeModel.find().sort({ dueDate: 1 }).lean(),
    FeePaymentModel.find({ studentId: student.id, status: 'PAID' }).lean(),
  ]);
  const byFee = new Map(paid.map((p) => [p.feeId, p]));
  const mine = fees.map((f) => out<Fee>(f)).filter((f) => appliesTo(f, student));
  // A fee the student already paid stays listed even if its target changes later.
  const ids = new Set(mine.map((f) => f.id));
  const extra = fees.filter((f) => byFee.has(f._id) && !ids.has(f._id)).map((f) => out<Fee>(f));
  return {
    fees: [...mine, ...extra].map((f) => {
      const p = byFee.get(f.id);
      return p ? { ...f, paymentId: p._id, receiptNumber: p.receiptNumber, paidAt: p.paidAt } : f;
    }),
    gateways: configuredGateways(),
  };
}

export type OrderResult = { alreadyPaid: true; paymentId: string } | { alreadyPaid: false; attemptId: string; checkout: Checkout };

/**
 * Start paying a fee through one gateway. Unfinished attempts from the last
 * few days are re-checked first, so a payment that went through elsewhere
 * (or whose browser closed before confirming) is recorded instead of
 * charging the student again.
 */
export async function createOrder(student: User, feeId: string, gatewayId: unknown, origin: string): Promise<OrderResult> {
  if (!isGatewayId(gatewayId)) throw new FeeError('Choose a payment method.');
  const gateway = GATEWAYS[gatewayId];
  if (!gateway.configured()) throw new FeeError(`${PAYMENT_GATEWAYS[gatewayId].label} is not set up yet.`, 503);
  await connectToDatabase();

  const paid = await FeePaymentModel.findOne({ feeId, studentId: student.id, status: 'PAID' }, { _id: 1 }).lean();
  if (paid) return { alreadyPaid: true, paymentId: paid._id };
  const doc = await FeeModel.findById(feeId).lean();
  const fee = doc && out<Fee>(doc);
  if (!fee || !appliesTo(fee, student)) throw new FeeError('Fee not found.', 404);

  const open = (await FeePaymentModel.find({ feeId, studentId: student.id, status: 'CREATED', createdAt: { $gte: new Date(Date.now() - RECHECK_MS).toISOString() } })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()).map((d) => out<FeePayment>(d));
  for (const a of open) {
    const st = await checkQuietly(a);
    if (st?.state === 'PAID') {
      const done = await recordPaid(a, st, student);
      if (done.paymentId) return { alreadyPaid: true, paymentId: done.paymentId };
    } else if (st?.state === 'FAILED') {
      await FeePaymentModel.updateOne({ _id: a.id, status: 'CREATED' }, { $set: { status: 'FAILED' } });
    }
  }
  const reusable = gateway.resume && open.find((a) => a.gateway === gatewayId && a.amount === fee.amount);
  if (reusable) return { alreadyPaid: false, attemptId: reusable.id, checkout: gateway.resume!(reusable) };

  const [campus, department] = await Promise.all([
    CampusModel.findById(student.campusId).lean(),
    student.departmentId ? DepartmentModel.findById(student.departmentId).lean() : null,
  ]);
  const id = newId('pay'); // 19 characters: fits every gateway's order-id limit
  const returnUrl = `${origin}/api/payments/return/${gatewayId}?attempt=${id}`;
  const collegeName = campus?.name ?? 'College';
  const started = await gateway.start({
    attemptId: id,
    amount: fee.amount,
    feeTitle: fee.title,
    collegeName,
    student: { id: student.id, name: student.fullName, email: student.email },
    returnUrl,
    cancelUrl: `${returnUrl}&cancel=1`,
  });
  await FeePaymentModel.create({
    _id: id,
    feeId,
    studentId: student.id,
    status: 'CREATED',
    gateway: gatewayId,
    gatewayOrderId: started.gatewayOrderId,
    amount: fee.amount,
    currency: 'INR',
    chargedAmount: started.charged?.amount,
    chargedCurrency: started.charged?.currency,
    exchangeRate: started.charged?.rate,
    createdAt: new Date().toISOString(),
    feeTitle: fee.title,
    academicYear: fee.academicYear ?? student.studentProfile?.academicYear,
    collegeName,
    departmentName: department?.name,
    studentName: student.fullName,
    enrollmentNumber: student.studentProfile?.enrollmentNumber ?? '',
    studentEmail: student.email,
  });
  return { alreadyPaid: false, attemptId: id, checkout: started.checkout };
}

/** One gateway being down or misconfigured must not stop the student paying through another. */
async function checkQuietly(a: FeePayment): Promise<Status | null> {
  try {
    return GATEWAYS[a.gateway].configured() ? await GATEWAYS[a.gateway].status(a) : null;
  } catch (e) {
    console.warn(`Could not re-check ${a.gateway} attempt ${a.id}:`, (e as Error).message);
    return null;
  }
}

export type ReturnOutcome = { paymentId?: string; outcome: 'paid' | 'pending' | 'failed' | 'cancelled' | 'duplicate' | 'error' };

/**
 * The student is back from a gateway's page. Whatever the browser brought
 * along is ignored: we look the attempt up and ask the gateway ourselves.
 * Works without a session, because some gateways post back cross-site.
 */
export async function completeReturn(gatewayId: string, attemptId: string, cancelled: boolean): Promise<ReturnOutcome> {
  if (!isGatewayId(gatewayId) || !ATTEMPT_ID.test(attemptId)) return { outcome: 'error' };
  await connectToDatabase();
  const doc = await FeePaymentModel.findById(attemptId).lean();
  if (!doc || doc.gateway !== gatewayId) return { outcome: 'error' };
  const a = out<FeePayment>(doc);
  if (a.status === 'PAID') return { paymentId: a.id, outcome: 'paid' };
  if (a.status === 'DUPLICATE') return { outcome: 'duplicate' };

  const st = await GATEWAYS[gatewayId].status(a);
  if (st.state === 'PAID') {
    const done = await recordPaid(a, st, null);
    return done.paymentId ? { paymentId: done.paymentId, outcome: 'paid' } : { outcome: done.duplicate ? 'duplicate' : 'error' };
  }
  if (st.state === 'FAILED') await FeePaymentModel.updateOne({ _id: a.id, status: 'CREATED' }, { $set: { status: 'FAILED' } });
  // UPI and some banks settle later: still CREATED, re-checked on the next "Pay".
  return { outcome: cancelled ? 'cancelled' : st.state === 'FAILED' ? 'failed' : 'pending' };
}

/** Razorpay's popup flow: check the signed result Checkout handed to the browser. */
export async function verifyRazorpayPayment(
  student: User,
  b: { razorpay_order_id?: unknown; razorpay_payment_id?: unknown; razorpay_signature?: unknown }
): Promise<FeePayment> {
  if (!GATEWAYS.razorpay.configured()) throw new FeeError('Razorpay is not set up yet.', 503);
  const orderId = typeof b.razorpay_order_id === 'string' ? b.razorpay_order_id : '';
  const paymentId = typeof b.razorpay_payment_id === 'string' ? b.razorpay_payment_id : '';
  const signature = typeof b.razorpay_signature === 'string' ? b.razorpay_signature : '';
  if (!/^order_\w+$/.test(orderId) || !/^pay_\w+$/.test(paymentId) || !/^[0-9a-f]{64}$/.test(signature)) {
    throw new FeeError('Incomplete payment response.');
  }
  await connectToDatabase();
  const doc = await FeePaymentModel.findOne({ gateway: 'razorpay', gatewayOrderId: orderId, studentId: student.id }).lean();
  if (!doc) throw new FeeError('Payment not found.', 404);
  const a = out<FeePayment>(doc);
  if (a.status === 'PAID') return a;
  const st = await confirmRazorpay(a, paymentId, signature);
  if (st.state !== 'PAID') throw new FeeError('The payment was not completed.');
  const done = await recordPaid(a, st, student);
  if (done.duplicate) throw new FeeError('This fee was already paid, so this payment will be refunded. The office has been told.', 409);
  if (!done.paymentId) throw new FeeError('The payment does not match this fee. Contact the office with the payment ID.');
  return out<FeePayment>(await FeePaymentModel.findById(done.paymentId).lean());
}

/**
 * Mark an attempt paid and give it a receipt number. Checks that the gateway
 * charged exactly what this attempt asked for. If the student had already
 * paid this fee through another attempt, this one becomes DUPLICATE.
 */
async function recordPaid(a: FeePayment, st: Status, actor: User | null): Promise<{ paymentId?: string; duplicate?: boolean }> {
  const wantAmount = a.chargedAmount ?? a.amount;
  const wantCurrency = a.chargedCurrency ?? 'INR';
  if (st.amount !== wantAmount || st.currency?.toUpperCase() !== wantCurrency) {
    console.error(`Amount mismatch on ${a.gateway} attempt ${a.id}: expected ${wantAmount} ${wantCurrency}, got ${st.amount} ${st.currency}.`);
    await audit(a, actor, 'FEE_PAYMENT_MISMATCH', `${a.gateway} reported ${st.amount} ${st.currency} for ${a.feeTitle} (expected ${wantAmount} ${wantCurrency}); not recorded.`);
    return {};
  }
  const set = { gatewayPaymentId: st.paymentId, method: st.method, paidAt: new Date().toISOString() };
  try {
    const receiptNumber = `RCPT-${todayIST().replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const r = await FeePaymentModel.updateOne({ _id: a.id, status: 'CREATED' }, { $set: { ...set, status: 'PAID', receiptNumber } });
    if (r.modifiedCount === 0) {
      // A parallel request recorded it first.
      const now = await FeePaymentModel.findById(a.id, { status: 1 }).lean();
      return now?.status === 'PAID' ? { paymentId: a.id } : { duplicate: now?.status === 'DUPLICATE' };
    }
    await audit(a, actor, 'FEE_PAID', `${a.feeTitle}: ${formatINR(a.amount)} via ${PAYMENT_GATEWAYS[a.gateway].label} (${st.paymentId}), receipt ${receiptNumber}.`);
    return { paymentId: a.id };
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e;
    // Already paid through another attempt: keep the money on record for a refund.
    await FeePaymentModel.updateOne({ _id: a.id, status: 'CREATED' }, { $set: { ...set, status: 'DUPLICATE' } });
    await audit(a, actor, 'FEE_PAID_TWICE', `${a.feeTitle} paid again via ${PAYMENT_GATEWAYS[a.gateway].label} (${st.paymentId}). Refund this payment in the gateway's dashboard.`);
    return { duplicate: true };
  }
}

const audit = (a: FeePayment, actor: User | null, action: string, details: string) =>
  dbService.addSystemAudit({
    userId: actor?.id ?? a.studentId,
    userName: actor?.fullName ?? a.studentName,
    action,
    entityName: 'FeePayment',
    entityId: a.id,
    details,
  });

/** A paid receipt: students see their own, the office sees all. */
export async function getReceipt(user: User, id: string): Promise<FeePayment> {
  await connectToDatabase();
  const p = await FeePaymentModel.findById(id).lean();
  // Same answer for "missing" and "not yours", so ids can't be probed.
  if (!p || p.status !== 'PAID' || (user.role === 'STUDENT' && p.studentId !== user.id)) {
    throw new FeeError('Receipt not found.', 404);
  }
  return out<FeePayment>(p);
}
