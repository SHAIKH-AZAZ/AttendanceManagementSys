# Contributing to AttendEASE365

Thanks for helping. These rules keep the app working for the students, teachers and
office staff who use it. If something here is unclear or out of date, fix it in the
same pull request.

## 1. Set up

- **Tools:** [Bun](https://bun.sh) 1.4+ and Node 26 (see `.node-version`). Use Bun for everything; don't add npm, yarn or pnpm lockfiles.
- **Install:** `bun install`
- **Environment:** create `.env.local` (never commit it; `.env*` is git-ignored):

  | Variable | Needed for | Notes |
  | --- | --- | --- |
  | `MONGODB_URI` | everything | Use your own test database, never production. An empty database is seeded with demo data on first start. |
  | `SESSION_SECRET` | production | In development a random one is used, so you're signed out when the server restarts. |
  | `NEXT_PUBLIC_DEMO_MODE`, `SEED_DEMO_DATA` | public demo | Demo mode makes the API read-only. |
  | Payment gateway keys | Fees tab | Test-mode keys only. See [docs/payments.md](docs/payments.md). |

- **Run:** `bun dev`, then open http://localhost:3000. Demo logins are in `src/lib/seed-data.ts`.
- **Reset the demo data:** `bun run db:reset --yes`. This **drops the database in `MONGODB_URI`**, so check which database it points at first.

## 2. Branches and pull requests

- `main` is what gets deployed. Don't push to it directly; open a pull request.
- Name branches by purpose: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- Keep each pull request to one topic. A refactor and a feature go in separate pull requests.
- The description says **what changed, why, and how you tested it**. For UI changes, add screenshots at desktop width and at phone width (390 px).
- Update the docs in the same pull request when behaviour changes: `docs/`, this file, and code comments.

## 3. Commit messages

- Imperative, specific summary up to about 72 characters: `Add PayU return-route check`, not `update` or `fixes`.
- Add a body when the *why* isn't obvious from the code.
- One logical change per commit. Don't mix formatting-only changes with real changes.

## 4. Before you open a pull request

All of these must pass:

```bash
bun run typecheck
bun run lint
bun run build
```

With `bun dev` running, also run the smoke tests that cover your change:

```bash
bash scripts/auth-check.sh     # sign-in and role access (always run this one)
bash scripts/fees-check.sh     # fees and payments
bash scripts/feature-check.sh  # files, notifications, allocation, import; needs a freshly reset DB
```

If you change behaviour these scripts check, update the script in the same pull request. If you add a new rule (who may do what, or what input is refused), add a check for it.

## 5. How the code is organised

- **This is Next.js 16 and React 19.** APIs differ from older versions. Read the guide under `node_modules/next/dist/docs/` before using a Next.js API you haven't used here (see `AGENTS.md`).
- **API routes** (`src/app/api/**/route.ts`) stay thin:
  1. Call `requireUser(...roles)` first.
  2. Call a service.
  3. Turn the service's error class into a status code.
- **Business logic** lives in `src/lib/services/` (or `src/lib/db-service.ts`). Services validate their own input; never trust the browser.
- **College rules** (thresholds, windows, approval rules) live in `src/lib/rules.ts`, not in routes or components.
- **Data:**
  - Models are defined in `src/models/index.ts` and use readable string `_id`s that the API exposes as `id`.
  - Enforce invariants with indexes, such as unique fields or one open draft per class.
  - Store money as integer paise.
- **Audit log:** record every action that changes records for other people, such as admin actions, approvals and payments, with `dbService.addSystemAudit`.
- **UI:** the app is moving from MUI to [Astryx](https://github.com/meta/astryx), one area at a time.
  - New UI uses Astryx components. The app shell (top bar, sidebar, sign-in) already does. Run `bunx astryx component <Name>` to read a component's props, and see the Astryx block in `AGENTS.md`.
  - The portals and the shared kit in `src/components/ui` are still MUI. When you change one, either keep it MUI or migrate the whole component; don't mix both in one component.
  - `src/app/layers.css` sets the CSS cascade-layer order (Astryx, MUI and Tailwind). It must stay the first import in `src/app/layout.tsx`. Keep global rules inside a layer, because unlayered CSS overrides every Astryx component.
  - **Theme:** the `attendease` theme lives in `themes/attendease/`. Change colours, fonts and spacing with `bunx astryx experimental theme editor set attendease …`, not with `:root` variables. The editor regenerates `src/themes/`. Don't edit those files by hand; they're excluded from lint.
  - Use `lucide-react` for icons.
  - Before adding a tab, add it to `src/lib/navigation.ts`. The sidebar reads it; give the tab an icon in `TAB_ICONS` in `src/components/layout/Navbar.tsx`.
- **Dependencies:** add one only when a few lines of code can't do the job, and say why in the pull request.

## 6. Accessibility and layout

- Every input needs a visible label. Group radio buttons in a `fieldset` with a `legend`.
- Everything must work with the keyboard alone. Scrollable tables must be focusable (`tabIndex={0}` and an accessible name).
- There must be no sideways scrolling at 390 px.
- Use `<output>` or `aria-live` for status messages, not colour alone.

## 7. Security rules

- Never commit secrets, `.env*` files, real student data or database dumps.
- Every protected route checks the role on the server. Hiding a button is not access control.
- Answer "not found" for records the user may not see, so ids can't be probed.
- **Payments are test mode only.**
  - Never add live keys or production gateway hosts.
  - Confirm payments with the gateway server-to-server, never from what the browser says.
- Don't loosen demo mode: `src/proxy.ts` keeps the public demo read-only.
- **Reporting a vulnerability:** don't open a public issue. Contact the maintainer privately through GitHub.

## 8. Reviews

- At least one approval is needed before merging into `main`.
- Reviewers check correctness, the rules above, and that the pull request was tested as described.
- Prefer a squash merge for small pull requests and a merge commit for multi-step features.
