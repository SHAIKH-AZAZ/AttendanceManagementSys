# Plan: Material UI migration and backend separation

Status (2026-11-15): **MUI migration phases 0–4 done**; Tailwind kept for page layout (phase 5 not done). Backend separation: plan only.

### MUI migration — what was actually done

- Installed `@mui/material` 9.5.0, `@mui/material-nextjs` 9.5.0 (`v16-appRouter`), Emotion 11.14. `AppRouterCacheProvider` with `enableCssLayer`; layer order `theme, base, mui, components, utilities` in `globals.css` (from MUI's bundled CSS-layers docs), so Tailwind layout classes still apply.
- Theme in `src/theme.ts` (colours, Plus Jakarta Sans, radii, component defaults).
- `src/components/ui/index.tsx` rebuilt on MUI with the same exports: Button, Card, StatCard (CardActionArea), Badge (Chip), Notice (Alert), Modal (Dialog — focus trap, Escape and scroll lock now come from MUI), ProgressBar (LinearProgress), SegmentedControl (ToggleButtonGroup). New: `AttendancePicker`, `SelectField`, `SearchField`.
- All screens converted: tables → MUI Table, inputs → TextField, selects → SelectField, checkbox → Checkbox, navbar → AppBar + scrollable Tabs + Menu, login → TextField with adornments, report → Dialog.
- Fixed on the way: printing the board report printed the whole app behind it (now prints only the report); empty board report could be opened for a class with no locked lectures.
- Measured: client JavaScript went from **202 KB to 297 KB gzip (+95 KB)**, inside the 80–120 KB estimate.
- Checked: typecheck, lint, production build, 27/27 smoke tests, every flow in a headless browser at 1440 px and 390 px (no sideways overflow), real keystroke typing in all dialogs, print preview of the report.

## 1. Where the project stands today (measured)

| Area | Today |
| --- | --- |
| UI code | 3,875 lines in 11 files (`src/components/**`, `src/app/page.tsx`, `layout.tsx`) |
| Styling | Tailwind CSS v4 utility classes: 576 `className` uses. Theme tokens in `src/app/globals.css` |
| Shared UI kit | `src/components/ui/index.tsx` (519 lines). Used 199 times: Button 44, Card 31, StatCard 20, EmptyState 19, Badge 19, PageHeader 17, Field 17, Notice 9, Modal 6, others 17 |
| Hand-written controls outside the kit | 52: 16 `<input>`, 12 `<select>`, 11 `<button>`, 10 `<table>`, 3 `<textarea>` |
| Icons | lucide-react |
| Client JavaScript | about 202 KB gzip (all built chunks) |
| Backend | 19 API route handlers inside Next.js (`src/app/api/**`) |
| Data | In memory (`src/lib/db-service.ts`, 778 lines). Everything resets when the server restarts |
| Database code | Mongoose + 12 schemas exist in `src/models/index.ts` and `src/lib/mongodb.ts`, but nothing uses them. The schemas reference records by MongoDB ObjectId while the app uses text IDs such as `sec-ds-a`, so they do not match the app |
| Auth | Signed httpOnly cookie, checked by `requireUser()` in every route; 27 smoke checks in `scripts/auth-check.sh` |

## 2. Material UI migration

### Is it worth it? (the case against, first)

- The app already looks like Material UI (white cards, 12px corners, soft shadows). Users will see little visual change.
- The current kit works and has been tested end to end. A switch costs about 22–32 hours and risks visual and behaviour regressions close to submission.
- MUI adds weight to every page (estimate below).
- The biggest functional defect today is **data loss on restart**, not the component library. If time is short, fix the database (part 3) first.

What MUI does give you:

- Pop-ups (Dialog), menus, tabs and selects with keyboard handling, focus trapping and screen-reader labels built in. The custom Modal needed a focus fix during testing; MUI's Dialog already handles this.
- One documented component set instead of a home-made one, which is easier for an evaluator or a second developer to follow.
- The same library as your other project (bbs-web uses the Modernize MUI template).

### Packages

| Package | Version | Why |
| --- | --- | --- |
| `@mui/material` | 9.5.0 | Components. Peer support: React 17–19 |
| `@emotion/react`, `@emotion/styled` | 11.14 | Styling engine MUI requires |
| `@mui/material-nextjs` | 9.5.0 | Next.js App Router integration (style cache, no unstyled flash). Supports Next 13–16 |

All are MIT licensed and free. The plan avoids **MUI X** (DataGrid Pro, date pickers Pro), which are paid. Dates stay as native `<input type="date">` inside `TextField`, so `@mui/x-date-pickers` and a date library aren't needed.

Icons: keep **lucide-react**. Switching to `@mui/icons-material` changes about 90 imports for no user-visible gain.

### Theme (one file, replaces the colour tokens)

`src/theme.ts` with `createTheme`:

- palette: primary `#1D4ED8`, success `#008C1F`, error `#C2410C`, warning amber, info blue, text `#2A3547` / `#5A6A85`, divider `#DFE5EF`, background `#F2F6FA` / `#FFFFFF`
- extra colour `medical` (violet) for the Medical status
- shape: `borderRadius: 8`; Card and Paper overridden to 12
- typography: Plus Jakarta Sans, weights 400–700, `button.textTransform: 'none'`
- component defaults: `MuiButton` `disableElevation`, `MuiCard` `variant="outlined"`, `MuiTextField` `size="small"`

### Component mapping

| Today | Material UI |
| --- | --- |
| `Button` | `Button` (contained / outlined / text; colours primary, error, success) |
| `Card`, `CardHeader` | `Card` + `CardContent`, `CardHeader` |
| `PageHeader`, `StatCard`, `EmptyState` | keep as small own components, built from `Stack`, `Typography`, `Card` |
| `Badge`, `StatusBadge`, `LeaveStatusBadge` | `Chip size="small"` with a status → colour map |
| `Notice` | `Alert` (with `onClose`) |
| `Modal` | `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions` (removes our own focus and Escape code) |
| `Field` + `input` / `textarea` | `TextField` (label, helperText, error, `multiline`) |
| `select` | `TextField select` + `MenuItem` |
| `SegmentedControl` | `ToggleButtonGroup exclusive` |
| `ProgressBar` | `LinearProgress variant="determinate"` + a 75% marker |
| P / A / L / E / M / O buttons | `ToggleButtonGroup exclusive` per student |
| tables | `TableContainer`, `Table`, `TableHead`, `TableRow`, `TableCell` |
| Navbar tabs | `AppBar` + `Toolbar` + `Tabs variant="scrollable"` |
| account dropdown | `Menu` + `MenuItem` |
| checkbox | `FormControlLabel` + `Checkbox` |
| file input | `Button component="label"` with a hidden `<input type="file">` |
| login blueprint/photo panel | stays custom (decorative) |

### Phases

| # | Work | Estimate |
| --- | --- | --- |
| 0 | Spike: install packages, add theme provider with `AppRouterCacheProvider` (CSS layer option on) so Tailwind and MUI styles load in a predictable order. Check: no unstyled flash, fonts load, measure bundle size | 2–3 h |
| 1 | Rewrite the **inside** of `src/components/ui/index.tsx` with MUI while keeping the same exported names and props. All 199 uses switch over without touching the portals | 5–7 h |
| 2 | App shell: Navbar → AppBar/Tabs/Menu; loading screen; footer | 2–3 h |
| 3 | Replace the 52 hand-written controls, screen by screen: Faculty (marking table, toggles, phone list) 4–5 h; Student 2 h; HOD 2–3 h; Admin + Users 3–4 h; Login 1–2 h; Report pop-up incl. print layout 1–2 h | 13–18 h |
| 4 | Check: screenshots at 1440 and 390 px for every tab, all flows (start, mark, lock, leave, approve, import, add user), keyboard use, printing the report | 2–3 h |
| 5 | *Optional:* remove Tailwind completely (move the remaining layout classes to `Stack`, `Grid`, `Box sx`) | +8–12 h |

**Total: 22–32 hours, or 30–44 hours if Tailwind is removed too.**

### Costs and risks

- **Page weight:** MUI + Emotion is expected to add about 80–120 KB gzip for the components used, on top of today's 202 KB. This is an estimate; phase 0 measures the real number. Acceptable for a college network, but noticeable on slow mobile data.
- **Two styling systems during phases 1–4:** Tailwind's reset and MUI's baseline can conflict. The CSS-layer setup in phase 0 must be confirmed before anything else.
- **Print layout:** the board report uses print styles. Re-check printing after phase 3.
- **Money:** none (MIT licences), as long as MUI X Pro components are not used.

### Alternatives to MUI (checked 2026-11-15 on npm)

| Library | Version | Styling engine | Fits Tailwind v4 already in the app? | Look | Downloads/week | Switch effort (est.) |
| --- | --- | --- | --- | --- | --- | --- |
| **MUI** `@mui/material` | 9.5.0 | Emotion (CSS-in-JS at runtime) | Coexists via CSS layers; two styling systems | Material Design | 13.8 M | 22–32 h |
| **shadcn/ui** (CLI `shadcn` + `radix-ui`) | 4.23 / 1.8 | Tailwind. Components are copied into your repo; no styling runtime | Yes, built on Tailwind v4 | Neutral, fully yours (can match the current look exactly) | 18.3 M (CLI) / 28.4 M (radix-ui) | 10–16 h |
| **Mantine** `@mantine/core` | 9.8.0 (needs React ≥ 19.2; project has 19.3) | CSS Modules + CSS variables, no runtime | Coexists; import Mantine's CSS file | Clean, neutral | 3.6 M | 20–28 h |
| **HeroUI** `@heroui/react` | 3.2.7 (needs React 19) | Tailwind v4 + React Aria | Yes | Rounded, modern, its own style | 1.2 M | 15–22 h |
| **Ant Design** `antd` | 6.7.0 | Own CSS-in-JS (`@ant-design/cssinjs`) | Coexists; two systems | Distinct "Ant" enterprise look | 4.9 M | 25–35 h |
| **Chakra UI** `@chakra-ui/react` | 3.38.0 | Emotion (runtime) | Coexists; two systems | Neutral | 2.2 M | 22–30 h |

Also checked and not shortlisted: Radix Themes 3.3 (fixed visual theme, less control), React Aria Components 1.22 (accessible but unstyled; more work than shadcn/ui for the same result), Fluent UI 9.75 (Microsoft Office look).

Effort figures are estimates for this codebase (199 kit uses + 52 hand-written controls), not measurements.

**How they differ for this project:**

- **shadcn/ui is the cheapest switch.** Tailwind stays, the current colours and look stay, and the Radix building blocks underneath give the same keyboard and screen-reader handling as MUI. The trade-off: the component code lives in your repo, so you maintain it, and there is no single library name or version to point evaluators to.
- **MUI makes sense if the goal is the Material look or matching your other MUI project (bbs-web).** It has the largest ecosystem of the true component libraries, but it adds a second styling system next to Tailwind and the most extra weight per page of the shortlist, together with Chakra and Ant Design.
- **Mantine is the middle ground:** a full component library plus form and date helpers, with no styling runtime. It has a smaller community than MUI, and it needs its own CSS file next to Tailwind.
- **Ant Design** has the richest built-in admin table (sorting, filters, pagination) and form validation, but its visual style clashes with the current design and it is heavy.
- **HeroUI and Chakra** have no clear advantage here over shadcn/ui and MUI respectively.

## 3. Backend separation

### What problem this solves (and what it doesn't)

Next.js route handlers already are a backend: the code runs on the server and the browser never sees it. Moving it to a separate service does **not** by itself fix anything a user would notice. The real defects are:

1. Data is kept in memory and lost on every restart.
2. The unused Mongoose models don't match the app's data.
3. Login has no rate limiting, and a session can't be revoked before it expires (only by deactivating the user).

So there are two options:

| | **A. Layered, same app** | **B. Separate API service** |
| --- | --- | --- |
| What | Move business logic into `src/server/` (services + data access). Route handlers become thin. Switch the in-memory store to MongoDB | New `apps/api` service with its own process and port. Next.js becomes frontend only |
| Fixes data loss | Yes | Yes |
| Extra moving parts | None | Second app to run, deploy and monitor; proxy setup |
| Good when | One developer, web only, short deadline | A mobile app or other clients are planned, or the evaluators expect a separate API |
| Estimate | 12–18 h | 22–33 h |

**Recommendation:** B only if one of its "good when" reasons applies. Otherwise A gives the same user-visible result for about half the work, and B can still be done later because A already separates the logic cleanly.

### Option B design (if chosen)

**Repository layout** (Bun workspaces, one repo):

```
apps/web        Next.js 16 + MUI. No database code, no secrets.
apps/api        Node API (Express 5.3 + TypeScript), Mongoose, zod validation
packages/shared types (User, LectureSession, …) and zod request schemas used by both
```

**Framework:** Express 5.3. Most widely known, so evaluators and other developers can read it. Alternatives: Fastify 5 (built-in schema validation, faster, less familiar); Hono 4 (very small, runs natively on Bun); NestJS 12 (strict module structure, much more boilerplate; not worth it at this size).

**How the browser reaches the API:** the browser keeps calling `/api/*` on the website's own address, and Next.js `rewrites` forward those calls to the API (for example `http://localhost:4000` in development). This keeps the session cookie same-origin, so there is no cross-site cookie or CORS setup. Calling the API directly from the browser would need `SameSite=None; Secure` cookies and CORS rules; avoid that.

**Auth moves to the API:** cookie signing, `requireUser` (as Express middleware), login and logout. Store sessions in a MongoDB `sessions` collection (with a TTL index) instead of the stateless signed token, so logout and "sign out everywhere" work for real. Add login rate limiting (`express-rate-limit`), security headers (`helmet`), request logs (`pino`), and a `/health` endpoint.

### Database (needed for A and B)

- **MongoDB via Mongoose.** Rewrite `src/models/index.ts` to match the app's types. Keep the database's own ObjectId, and expose it to the frontend as a text `id` through `toJSON`, so the frontend doesn't change.
- **Lecture attendance** stays embedded in the lecture document. About 60 students × about 150 bytes is about 9 KB per lecture, far below MongoDB's 16 MB document limit.
- **Indexes that enforce the rules:**
  - unique `users.email`
  - unique `(sectionId, sessionNumber)` on lectures
  - partial unique index on `sectionId` where `isLocked: false`, so the database itself guarantees one open draft per class even if two requests arrive together
  - `(departmentId, status)` on leaves
  - `timestamp` on the audit log
- **Leave approval** updates the leave and several lectures together. Run it in a transaction, which needs MongoDB as a replica set. MongoDB Atlas provides that; locally use `mongod --replSet` or a Docker image.
- **Audit log** stays append-only: no update or delete endpoints.
- **Seeding:** `bun run seed` loads the demo data; demo accounts only in development.
- **Size check:** a few classes × 60 lectures × 9 KB is a few MB, so a free Atlas cluster (512 MB) is enough for a college deployment.

### Phases (option B; option A skips 1–3)

| # | Work | Estimate |
| --- | --- | --- |
| 1 | Move the Next.js app into `apps/web` unchanged; create `packages/shared` with the types | 2–3 h |
| 2 | Build `apps/api` with the same 19 endpoints and the same JSON responses, still on the in-memory store. Point `scripts/auth-check.sh` at it; all 27 checks must pass | 6–8 h |
| 3 | Next.js `rewrites` to the API; delete the old route handlers | 1–2 h |
| 4 | Swap the in-memory store for MongoDB behind the same service functions; schemas, indexes, seed, transaction | 8–12 h |
| 5 | Database sessions, rate limiting, helmet, logging, `/health` | 3–4 h |
| 6 | Deploy: web host + API host + Atlas; environment variables (`SESSION_SECRET`, `MONGODB_URI`) | 2–4 h |

**Total option B: 22–33 hours. Option A (phases 4–6 inside the current app): 12–18 hours.**

### Running costs

- MongoDB Atlas, Vercel and several API hosts have free tiers. Check their current limits before choosing.
- Free API hosts usually **sleep when idle**, so the first request after a pause can take tens of seconds. That is a real risk during a live demo; either wake the API before the demo or use a paid tier or a college server.

## 4. Suggested order

1. Database first (option A phases, or B phases 1–4): this fixes the one defect users would notice.
2. MUI phases 0–4 on the frontend (independent of the backend once step 1's structure is in place).
3. Tailwind removal (MUI phase 5) only if time is left.

## 5. Decisions needed before starting

1. Backend: **A** (layered, same app) or **B** (separate API service)?
2. If B: Express (recommended), Fastify, Hono or NestJS?
3. Remove Tailwind completely (+8–12 h), or keep it for page layout only?
4. Where will it run for the submission or real use (college server, free hosting, or only on your laptop for a demo)? This decides the deployment phase and whether the idle-sleep risk matters.
5. Still open from earlier: GEC Modasa branding details (college name on reports, email domain, semesters or trimesters, IT course codes).
