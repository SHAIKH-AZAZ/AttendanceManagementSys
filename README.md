# AttendEASE365

Attendance, marks and fee management for a college, built for Government
Engineering College, Modasa. Teachers take attendance by the lecture, students see
where they stand against the 75% rule, the HOD approves and reports, and the office
runs users, the academic calendar and fees.

## What each role can do

| Role | Features |
| --- | --- |
| **Student** | Attendance overview and lecture history, published marks, assignments (submit files or text), exam schedule and holidays, leave requests with proof, fees paid online with printable receipts |
| **Faculty** | Take attendance (drafts, then submit and lock), sessions, marks entry, assignments and grading, schedule, defaulter list |
| **HOD** | Leave approvals, marks review (approve or return), defaulters, allocating teachers to classes, schedule, examination-board reports |
| **Admin staff** | Users, academic structure (subjects, classes, divisions), exams and calendar, fees and payments, bulk student import, reports, audit log |

Every change that affects other people is written to the audit log. Students only ever see their own records.

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router) with React 19 and TypeScript. The API is Next.js route handlers in `src/app/api`.
- MongoDB with Mongoose. Files are stored in GridFS.
- MUI 9 components, with Tailwind CSS 4 for layout and lucide-react for icons.
- Online fee payment in **test mode** through Razorpay, Cashfree, PayU, Paytm, Stripe and PayPal (see [docs/payments.md](docs/payments.md)).
- [Bun](https://bun.sh) for installing, running and type-checking, and oxlint for linting. Deployed on Vercel.

## Getting started

You need Bun 1.4+, Node 26 and a MongoDB database you can write to (a free Atlas cluster is enough).

```bash
bun install
```

Create `.env.local` (git-ignored):

```bash
MONGODB_URI=mongodb+srv://…        # your own test database
# SESSION_SECRET=…                 # required in production; optional in development
# NEXT_PUBLIC_DEMO_MODE=true       # public demo: read-only API, demo logins shown
# SEED_DEMO_DATA=true              # allow demo data to be seeded in production
# Payment gateway test keys: see docs/payments.md
```

```bash
bun dev
```

Open http://localhost:3000. An empty database is filled with demo data on first start. The demo logins (student, faculty, HOD and admin) are in `src/lib/seed-data.ts` and shown on the sign-in page in development.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Development server |
| `bun run build` / `bun start` | Production build and server |
| `bun run typecheck` | TypeScript check |
| `bun run lint` | oxlint |
| `bun run db:reset --yes` | **Drops** the database in `MONGODB_URI` and reloads the demo data. Refuses to run in production. |
| `bash scripts/auth-check.sh [url]` | Smoke test: sign-in and role access |
| `bash scripts/feature-check.sh [url]` | Smoke test: files, notifications, allocation, import (needs a fresh database) |
| `bash scripts/fees-check.sh [url]` | Smoke test: fees, payment access rules and the payment return route |

## Project layout

```
src/app/            pages and API routes (src/app/api/**/route.ts)
src/components/     UI by role, plus the shared kit in components/ui
src/lib/services/   business logic used by the API routes
src/lib/payments/   one file per payment gateway
src/lib/rules.ts    college rules (75% threshold, entry window, approvals)
src/models/         MongoDB schemas and indexes
scripts/            database reset and smoke tests
docs/               payment setup and feature plans
```

## Documentation

- [Payment gateways: setup and test details](docs/payments.md)
- [Feature roadmap](docs/plans/feature-roadmap.md)
- [MUI migration and backend options](docs/plans/mui-and-backend-separation.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch and commit rules, the checks to run before a pull request, and the security rules.
