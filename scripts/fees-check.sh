#!/usr/bin/env bash
# Fee and payment checks: who may do what, and input validation. Creates one
# fee and removes it again. Run against a dev server on the demo data:
#   bash scripts/fees-check.sh [base_url]
# Each run notifies the demo students about the test fee (notifications stay).
# Without Razorpay keys in .env.local the order and verify calls answer 503 (expected).
set -u
HAS_KEYS=$( { [ -n "${RAZORPAY_KEY_ID:-}" ] || grep -qs '^RAZORPAY_KEY_ID=rzp_test_' .env.local; } && echo yes || echo no)
NO_FEE=$( [ "$HAS_KEYS" = yes ] && echo 404 || echo 503)
BASE="${1:-http://localhost:3000}"
JAR=$(mktemp -d)
trap 'rm -rf "$JAR"' EXIT
fail=0
expect() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (expected $2, got $3)"; fail=1; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { code -c "$JAR/$1" -H 'Content-Type: application/json' -d "{\"email\":\"$2\",\"password\":\"$3\"}" "$BASE/api/auth/login"; }
json() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)"; }
post() { curl -s -b "$JAR/$1" -H 'Content-Type: application/json' -d "$3" -w '\n%{http_code}' "$BASE$2"; }

login stu devendra.joshi@univ.edu student123 >/dev/null
login fac rajesh.sharma@univ.edu faculty123 >/dev/null
login adm arun.kulkarni@univ.edu admin123 >/dev/null

expect "fees need sign-in"                401 "$(code "$BASE/api/student/fees")"
expect "faculty can't list student fees"  403 "$(code -b "$JAR/fac" "$BASE/api/student/fees")"
expect "student can't list office fees"   403 "$(code -b "$JAR/stu" "$BASE/api/admin/fees")"
expect "student can't create a fee"       403 "$(post stu /api/admin/fees '{"title":"x","amount":"100","dueDate":"2026-12-01"}' | tail -1)"
expect "zero amount rejected"             400 "$(post adm /api/admin/fees '{"title":"x","amount":"0","dueDate":"2026-12-01"}' | tail -1)"
expect "3-decimal amount rejected"        400 "$(post adm /api/admin/fees '{"title":"x","amount":"10.505","dueDate":"2026-12-01"}' | tail -1)"
expect "missing due date rejected"        400 "$(post adm /api/admin/fees '{"title":"x","amount":"100"}' | tail -1)"
expect "unknown department rejected"      400 "$(post adm /api/admin/fees '{"title":"x","amount":"100","dueDate":"2026-12-01","departmentId":"nope"}' | tail -1)"

R=$(post adm /api/admin/fees '{"title":"Check fee (fees-check.sh)","amount":"1250.50","dueDate":"2026-12-01"}')
expect "office creates a fee"             201 "$(echo "$R" | tail -1)"
FID=$(echo "$R" | head -1 | json "d['fee']['id']")
expect "amount stored in paise"           125050 "$(echo "$R" | head -1 | json "d['fee']['amount']")"
expect "student sees the fee"             yes "$(curl -s -b "$JAR/stu" "$BASE/api/student/fees" | json "'yes' if any(f['id']=='$FID' for f in d['fees']) else 'no'")"
expect "office sees expected count > 0"   yes "$(curl -s -b "$JAR/adm" "$BASE/api/admin/fees" | json "'yes' if next(f for f in d['fees'] if f['id']=='$FID')['expected']>0 else 'no'")"
expect "office lists who hasn't paid"     200 "$(code -b "$JAR/adm" "$BASE/api/admin/fees/$FID/payments")"
expect "student can't see payment list"   403 "$(code -b "$JAR/stu" "$BASE/api/admin/fees/$FID/payments")"
expect "office can't pay a fee"           403 "$(post adm "/api/student/fees/$FID/order" '{"gateway":"razorpay"}' | tail -1)"
expect "paying needs a gateway"           400 "$(post stu "/api/student/fees/$FID/order" '{}' | tail -1)"
expect "unknown gateway rejected"         400 "$(post stu "/api/student/fees/$FID/order" '{"gateway":"bitcoin"}' | tail -1)"
UNSET=$(for g in STRIPE_SECRET_KEY:stripe PAYPAL_CLIENT_ID:paypal CASHFREE_APP_ID:cashfree PAYU_KEY:payu PAYTM_MID:paytm; do grep -qs "^${g%%:*}=." .env.local || { echo "${g##*:}"; break; }; done)
[ -n "$UNSET" ] && expect "gateway without keys is 503 ($UNSET)" 503 "$(post stu "/api/student/fees/$FID/order" "{\"gateway\":\"$UNSET\"}" | tail -1)"
expect "unknown fee can't be paid"        "$NO_FEE" "$(post stu /api/student/fees/fee-nope/order '{"gateway":"razorpay"}' | tail -1)"
# Return route: no session needed, never trusts the browser, always 303s back into the app.
loc() { curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$@"; }
expect "bogus attempt → error notice"     "303 $BASE/?tab=student-fees&payment=error" "$(loc "$BASE/api/payments/return/stripe?attempt=pay-zzzz-000000")"
expect "return also accepts POST"         "303 $BASE/?tab=student-fees&payment=error" "$(loc -X POST "$BASE/api/payments/return/payu?attempt=nope")"
expect "unknown gateway path → error"     "303 $BASE/?tab=student-fees&payment=error" "$(loc "$BASE/api/payments/return/evil?attempt=pay-zzzz-000000")"
if [ "$HAS_KEYS" = yes ]; then
  O=$(post stu "/api/student/fees/$FID/order" '{"gateway":"razorpay"}')
  expect "razorpay test order created"    200 "$(echo "$O" | tail -1)"
  AID=$(echo "$O" | head -1 | json "d.get('attemptId','')")
  expect "retry reuses the razorpay order" "$AID" "$(post stu "/api/student/fees/$FID/order" '{"gateway":"razorpay"}' | head -1 | json "d.get('attemptId','')")"
  expect "wrong gateway for attempt → error" "303 $BASE/?tab=student-fees&payment=error" "$(loc "$BASE/api/payments/return/stripe?attempt=$AID")"
  expect "unpaid attempt → pending"       "303 $BASE/?tab=student-fees&payment=pending" "$(loc "$BASE/api/payments/return/razorpay?attempt=$AID")"
  expect "cancelled attempt → cancelled"  "303 $BASE/?tab=student-fees&payment=cancelled" "$(loc "$BASE/api/payments/return/razorpay?attempt=$AID&cancel=1")"
fi
expect "forged verify rejected"           "$NO_FEE" "$(post stu /api/student/payments/verify '{"razorpay_order_id":"order_fake","razorpay_payment_id":"pay_fake","razorpay_signature":"'"$(printf '0%.0s' {1..64})"'"}' | tail -1)"
expect "unknown receipt is 404"           404 "$(code -b "$JAR/stu" "$BASE/api/payments/pay-nope")"
expect "faculty can't open receipts"      403 "$(code -b "$JAR/fac" "$BASE/api/payments/pay-nope")"
expect "office removes unpaid fee"        200 "$(code -b "$JAR/adm" -X DELETE "$BASE/api/admin/fees/$FID")"
expect "removed fee is gone"              404 "$(code -b "$JAR/adm" -X DELETE "$BASE/api/admin/fees/$FID")"

exit $fail
