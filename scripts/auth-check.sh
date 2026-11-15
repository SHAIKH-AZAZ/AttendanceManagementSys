#!/usr/bin/env bash
# Smoke test for login + role-based access. Run against a fresh dev server:
#   bun run dev   (in another terminal)
#   bash scripts/auth-check.sh [base_url]
set -u
TODAY=$(TZ=Asia/Kolkata date +%F)
BASE="${1:-http://localhost:3000}"
JAR=$(mktemp -d)
trap 'rm -rf "$JAR"' EXIT
fail=0

expect() { # name expected actual
  if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1 (expected $2, got $3)"; fail=1; fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { # jar email password -> status
  code -c "$JAR/$1" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$2\",\"password\":\"$3\"}" "$BASE/api/auth/login"
}

expect "wrong password rejected"        401 "$(login x rajesh.sharma@univ.edu nope)"
expect "empty password rejected"        400 "$(login x rajesh.sharma@univ.edu '')"
expect "ssoRole bypass rejected"        400 "$(code -H 'Content-Type: application/json' -d '{"ssoRole":"ADMIN_STAFF"}' "$BASE/api/auth/login")"
expect "/me without session"            401 "$(code "$BASE/api/auth/me")"
expect "forged legacy cookie ignored"   401 "$(code -b 'attendease_user_id=user-admin-1' "$BASE/api/admin/users")"
expect "forged session cookie ignored"  401 "$(code -b 'attendease_session=eyJ1aWQiOiJ1c2VyLWFkbWluLTEiLCJleHAiOjk5OTk5OTk5OTl9.bad' "$BASE/api/admin/users")"

expect "student login"                  200 "$(login stu devendra.joshi@univ.edu student123)"
expect "student blocked from admin"     403 "$(code -b "$JAR/stu" "$BASE/api/admin/users")"
expect "student blocked from sessions"  403 "$(code -b "$JAR/stu" "$BASE/api/sessions")"
other=$(curl -s -b "$JAR/stu" "$BASE/api/student/summary?studentId=stu-1" | grep -o '"studentId":"[^"]*"' | sort -u | tr '\n' ' ')
expect "student summary scoped to self" '"studentId":"stu-4" ' "$other"

expect "faculty login"                  200 "$(login fac rajesh.sharma@univ.edu faculty123)"
expect "faculty sees sessions"          200 "$(code -b "$JAR/fac" "$BASE/api/sessions")"
expect "faculty blocked from review"    403 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"status":"APPROVED"}' "$BASE/api/leaves/x/review")"

expect "admin login"                    200 "$(login adm arun.kulkarni@univ.edu admin123)"
body=$(curl -s -b "$JAR/adm" "$BASE/api/admin/users")
expect "admin lists users"              yes "$(echo "$body" | grep -q '"users"' && echo yes || echo no)"
expect "no password in user list"       no  "$(echo "$body" | grep -q '"password"' && echo yes || echo no)"
# --- academic data + lecture rules ---
meta=$(curl -s -b "$JAR/stu" "$BASE/api/meta")
expect "meta readable by student"       yes "$(echo "$meta" | grep -q '"sections"' && echo yes || echo no)"
expect "meta hides class rosters"       no  "$(echo "$meta" | grep -q 'enrolledStudents' && echo yes || echo no)"
expect "meta requires sign-in"          401 "$(code "$BASE/api/meta")"
expect "faculty2 login"                 200 "$(login fac2 anita.desai@univ.edu faculty123)"
expect "faculty can't start other's class" 403 "$(code -b "$JAR/fac2" -H 'Content-Type: application/json' -d '{"sectionId":"sec-ds-a","lectureDate":"2026-11-01"}' "$BASE/api/sessions")"
expect "bad period count rejected"     400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"sectionId":"sec-ds-b","lectureDate":"'"$TODAY"'","periods":5}' "$BASE/api/sessions")"
expect "future lecture date rejected"  400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"sectionId":"sec-ds-b","lectureDate":"2099-01-01"}' "$BASE/api/sessions")"
expect "lecture older than window rejected" 400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"sectionId":"sec-ds-b","lectureDate":"2020-01-01"}' "$BASE/api/sessions")"
expect "bad lecture date rejected"      400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"sectionId":"sec-ds-b","lectureDate":"tomorrow"}' "$BASE/api/sessions")"
draft=$(curl -s -b "$JAR/fac" "$BASE/api/sessions" | grep -o '"id":"[^"]*","campusId[^}]*"isLocked":false' | head -1 | grep -o '^"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$draft" ]; then
  expect "empty draft payload rejected" 400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"records":[]}' "$BASE/api/sessions/$draft/draft")"
  expect "unknown student rejected"     400 "$(code -b "$JAR/fac" -H 'Content-Type: application/json' -d '{"records":[{"studentId":"nobody","status":"ABSENT"}]}' "$BASE/api/sessions/$draft/draft")"
fi
expect "short password rejected"       400 "$(code -b "$JAR/adm" -H 'Content-Type: application/json' -d '{"email":"x@y.z","fullName":"X","role":"STUDENT","password":"short"}' "$BASE/api/admin/users")"

expect "logout"                         200 "$(code -b "$JAR/adm" -c "$JAR/adm" -X POST "$BASE/api/auth/logout")"
expect "/me after logout"               401 "$(code -b "$JAR/adm" "$BASE/api/auth/me")"

exit $fail
