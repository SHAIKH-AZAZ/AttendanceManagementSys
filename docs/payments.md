# Fee payments: gateway setup (test mode only)

Students pick a gateway in the Fees tab. A gateway is offered once its keys are
in `.env.local` (and in the Vercel project's environment variables for a deploy).
Cashfree, PayU, Paytm and PayPal call their sandbox hosts only (hard-coded in
`src/lib/payments/*.ts`). Razorpay and Stripe use the same host for test and live,
so they refuse any key that isn't a test key (`rzp_test_…`, `sk_test_…`). No real
money can move. Restart the dev server after changing keys.

| Gateway | Keys | Where to get them | Checkout | Status |
| --- | --- | --- | --- | --- |
| Razorpay | `RAZORPAY_KEY_ID` (`rzp_test_…`), `RAZORPAY_KEY_SECRET` | Dashboard → Test Mode → Account & Settings → API Keys | Popup | Tested end to end (2026-11-22) |
| Cashfree | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` | merchant.cashfree.com → Developers → API Keys (Test) | Cashfree JS SDK, sandbox | Built, not yet run against the sandbox |
| PayU India | `PAYU_KEY`, `PAYU_SALT` | PayU dashboard → Test Mode → Developer → API Keys | Signed form post to test.payu.in | Built, not yet run against the sandbox |
| Paytm | `PAYTM_MID`, `PAYTM_MERCHANT_KEY` (16 characters), optional `PAYTM_WEBSITE` (default `WEBSTAGING`) | dashboard.paytmpayments.com → API Keys (staging) | Paytm JS Checkout, staging | Built, not yet run against the sandbox; signature checked against Paytm's official library |
| Stripe | `STRIPE_SECRET_KEY` (`sk_test_…`) | dashboard.stripe.com → Developers → API keys (test mode) | Hosted Checkout page | Built, not yet run against the sandbox |
| PayPal | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, optional `PAYPAL_INR_PER_USD` (default 85) | developer.paypal.com → Apps & Credentials (Sandbox) | PayPal sandbox approval page | Built, not yet run against the sandbox |

Optional: `APP_URL` (e.g. `https://your-app.vercel.app`) fixes the address gateways send students back to. By default it comes from the request's `Host` header.

## Test details (shown to students in the payment picker)

- **Razorpay:** card 4100 2800 0000 1007, any future expiry, any CVV, any 4–10 digit OTP. Net banking opens a test-bank popup; click Success.
- **Cashfree:** card 4576 2389 1277 1450, expiry 03/28, CVV 123, OTP 111000. UPI `testsuccess@gocash`.
- **PayU:** card 5123 4567 8901 2346, expiry 05/30, CVV 123, OTP 123456. Net banking user `payu`, password `payu`.
- **Paytm:** pick card or net banking and choose "success" on Paytm's test page. UPI `7777777777@paytm`.
- **Stripe:** card 4242 4242 4242 4242, any future date, any CVC. India-issued test card: 4000 0035 6000 0008.
- **PayPal:** log in with the default sandbox *personal* account (developer.paypal.com → Testing Tools → Sandbox Accounts → View/Edit → Login Info).

## Things to know

- **PayPal charges in USD.** PayPal does not support INR, so the fee is converted at `PAYPAL_INR_PER_USD`, and the receipt shows both amounts.
- **Stripe and INR:** a Stripe account outside India may not be allowed to charge INR. If so, the student sees Stripe's own error message.
- **Cashfree, PayU and Paytm** require a customer phone number. Students have none on file, so the sandbox placeholder `9999999999` is sent.
- **Instamojo was dropped.** Its sandbox host `test.instamojo.com` no longer exists: on 2026-11-22, both Cloudflare's and Google's public DNS answered NXDOMAIN.
- **How a payment is confirmed:** the gateway sends the student back to `/api/payments/return/<gateway>?attempt=…`. The server then asks the gateway directly. Nothing the browser sends is trusted, and the route doesn't need the session, since PayU and Paytm post back from their own site. Razorpay's popup flow instead checks the payment signature and then fetches the payment from Razorpay.
- **Paying twice:**
  - Before starting a new attempt, the server re-checks the student's unfinished attempts from the last three days.
  - If two payments still succeed, the second is marked `DUPLICATE`, and the office's Fees tab shows "refund needed".
  - Refunds are made in the gateway's own dashboard.
- **Pending payments:** UPI and some banks can stay pending. The attempt stays open and is re-checked the next time the student presses Pay.
- **Checks:** `bash scripts/fees-check.sh [base_url]` covers access rules, validation and the return route, and creates a Razorpay test order when keys are set.
