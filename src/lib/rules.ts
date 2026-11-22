/** College rules in one place. Change these values here, not in the routes. */

/** Faculty may enter a lecture at most this many days after it happened. */
export const ATTENDANCE_ENTRY_WINDOW_DAYS = 7;

/** Minimum attendance (percent, by periods) to be eligible for exams. */
export const MIN_ATTENDANCE_PERCENT = 75;

/** Today's date in India (YYYY-MM-DD), regardless of the server's own time zone. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/** `date` minus `days`, as YYYY-MM-DD. */
/** True once an ISO deadline is behind us (read at render time; updates on next render). */
export const isPast = (iso: string) => Date.now() > Date.parse(iso);

export const daysBefore = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

/** Marks go to the HOD for approval before students can see them. Set false to let faculty publish directly. */
export const MARKS_NEED_HOD_APPROVAL = true;

/** Suggested assessment types (free text is also allowed). */
export const ASSESSMENT_COMPONENTS = ['Mid-semester exam', 'Unit test', 'Quiz', 'Assignment', 'Viva', 'Practical', 'Other'];

/** Paise as rupees in Indian grouping: 4500000 → "₹45,000", 125050 → "₹1,250.50". */
export const formatINR = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);

/** Payment gateways in the order students see them, with sandbox test details. All run in test mode only. */
export const PAYMENT_GATEWAYS = {
  razorpay: { label: 'Razorpay', hint: 'UPI, cards, net banking. Test card 4100 2800 0000 1007, any future expiry, any CVV, OTP of 4–10 digits.' },
  cashfree: { label: 'Cashfree', hint: 'Test card 4576 2389 1277 1450, expiry 03/28, CVV 123, OTP 111000. UPI: testsuccess@gocash.' },
  payu: { label: 'PayU', hint: 'Test card 5123 4567 8901 2346, expiry 05/30, CVV 123, OTP 123456.' },
  paytm: { label: 'Paytm', hint: 'Choose a card or net banking and pick “success” on Paytm’s test page. UPI: 7777777777@paytm.' },
  stripe: { label: 'Stripe', hint: 'Test card 4242 4242 4242 4242, any future date, any CVC.' },
  paypal: { label: 'PayPal', hint: 'Log in with your PayPal sandbox buyer account. Charged in US dollars (converted).' },
} as const;
