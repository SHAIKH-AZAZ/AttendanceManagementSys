# Plan: marks, assignments and the remaining features

Status (2026-11-15): **phases 1–5 built**; phases 6–8 not started. Companion to `mui-and-backend-separation.md`.

## What was built (phases 1–5)

| Phase | Done |
| --- | --- |
| 1 | MongoDB (Atlas) replaces the in-memory store (`src/lib/db-service.ts`, `src/models`); indexes enforce one open draft per class, unique lecture numbers, unique email; leave approval runs in a transaction; `bun run db:reset` reloads demo data. GEC Modasa branding on the board report (real faculty and HOD names, blank signature lines). Lectures can be entered at most 7 days late (`src/lib/rules.ts`). |
| 2 | Classes carry divisions and lab batches; admin adds subjects and classes; HOD **Allocation** tab assigns teachers; in-app notifications (bell); file uploads stored in MongoDB GridFS with type checks and per-file access rules; leave proof is a real upload; bulk import creates student logins with one-time temporary passwords. |
| 3 | **Marks**: teacher creates an assessment, enters marks (AB for absent), submits; HOD approves or returns with a comment; students see their own published marks with class average and highest. `MARKS_NEED_HOD_APPROVAL` in `src/lib/rules.ts`. |
| 4 | **Assignments**: teacher publishes with due date, optional marks and attachments; students submit text/files and can resubmit until graded; late flagged or refused; teacher grades with feedback. |
| 5 | **Exams & calendar**: admin schedules exams (clash checks by division and room) and holidays/events; everyone gets a Schedule tab for what applies to them; holidays block lectures. |

Checks: `scripts/auth-check.sh` (30) and `scripts/feature-check.sh` (68), run on a freshly reset database.

Decisions taken as defaults (change in `src/lib/rules.ts` or ask): HOD approval of marks on; free assessment types instead of a GTU scheme; theory and lab attendance combined per subject; 7-day entry window.

## 0. Ground rules for every feature below

- **Database first.** Today all data lives in server memory and is lost on restart (see the backend plan). Every feature here adds new records (marks, assignments, submissions, schedules). Building them on the in-memory store means writing them twice. Do the MongoDB work (backend plan, option A) before phase 2.
- **Same patterns as attendance**, so the app stays predictable:
  - draft → submit → locked, with corrections only through the HOD and recorded in the audit log;
  - the server takes identity from the session, never from the request;
  - a teacher can only act on classes assigned to them;
  - students only ever see their own records;
  - every create, publish or change writes an audit entry.
- **Nothing hard-coded about GTU rules.** Mark components, maximum marks and passing rules are stored as data per subject, because the exact GTU scheme for GEC's 2026 syllabus must come from the college (see "Decisions needed").

## 1. Shared groundwork (needed by most features)

| Item | Why | Est. |
| --- | --- | --- |
| **MongoDB** (backend plan, option A) | Data survives restarts; needed before any new records | 12–18 h |
| **Semester structure**: semester → division (5CEA, 5ITB…) → batch (A1–A4) → subject; combined classes (one lecture for two divisions, e.g. PDS for 5CEA + 5CEB) | Matches the real timetable; marks, assignments and exams all hang off it | 8–10 h |
| **Subject allocation** (HOD assigns teacher ↔ subject ↔ division/batch) | Decides who may take attendance, enter marks and publish assignments | 4–6 h |
| **In-app notifications** (bell icon with unread count, list) | Students need to know when marks or assignments are published or a leave is decided. Email later | 5–7 h |
| **File storage** for assignment files and leave proof | Today only file names are stored. Options: a folder on the college server (simplest when self-hosted), or Vercel Blob / Cloudflare R2 when deployed online | 4–6 h |

## 2. Marks (exams and viva)

### What users do

- **Faculty**:
  - create an assessment for a class: name ("Mid-sem 1", "Practical viva"), component, date, maximum marks;
  - enter marks in a grid, where each student gets a number, **AB** (absent) or blank;
  - save a draft, then submit;
  - optionally import marks from CSV or Excel.
- **HOD**: review the submitted marks (class average, highest, lowest, how many absent, how many below passing), then **approve** (which publishes them) or **send back** with a comment.
- **Student**: a "Marks" tab with each published assessment per subject (marks out of maximum, class average) and their component totals per subject.
- **After publishing**: marks are locked. A correction needs a faculty request, HOD approval, and an audit entry showing the old and new value.

### Rules the server enforces

- Marks between 0 and the maximum, at most two decimals; `AB` is stored separately from 0.
- Only the teacher allocated to that subject and class can create or edit; only the HOD of that department can approve.
- Students see an assessment only after it is published.
- Each subject has an **assessment scheme**: a list of components with maximum marks, for example "Mid-sem 30, Assignment 10, Viva 20". Admin or HOD sets it per subject; the defaults come from the GTU scheme the college gives us.

### Data (MongoDB)

```
Assessment   { subjectId, classId (division or batch), component, title, date,
               maxMarks, status: DRAFT | SUBMITTED | PUBLISHED, createdBy,
               submittedAt, reviewedBy, publishedAt,
               entries: [{ studentId, marks | null, absent: boolean, remark }] }
AssessmentScheme { subjectId, components: [{ key, label, maxMarks, kind: THEORY | PRACTICAL }] }
MarksCorrection  { assessmentId, studentId, oldValue, newValue, reason, status, decidedBy }
```

Entries are embedded in the assessment, like attendance records in a lecture (60 students × ~50 bytes, far below MongoDB's per-record limit).

### Screens

- Faculty: tab **Marks**: assessments per class, a "New assessment" dialog, the mark-entry grid (keyboard-friendly: Enter moves down, `a` types AB), CSV import, submit.
- HOD: tab **Approvals** (shared with leave): marks waiting for review, with summary numbers and the full list.
- Student: tab **Marks**.

**Estimate: 22–30 h** (after the groundwork).

## 3. Assignments

### What users do

- **Faculty**: publish an assignment for a class or batch: title, instructions, due date and time, optional maximum marks, optional attachment, and whether late submission is allowed. See who has submitted, who is late and who is missing. Grade with marks and feedback, then return.
- **Student**: tab **Assignments**: upcoming (sorted by due date), submitted, graded. Submit text and/or a file; resubmit until the due date (or until graded); see marks and feedback.

### Rules

- File types: PDF, images, DOC/DOCX, ZIP; size limit (for example 10 MB). Files are checked on the server, not only in the browser.
- After the due date, submissions are marked **late**, or blocked if the teacher turned late submission off.
- Students can only read their own submissions. Teachers can read only submissions for their classes.
- Assignment marks can feed the "Assignment" component of the marks scheme (optional link).

### Data

```
Assignment  { classId, subjectId, title, instructions, dueAt, maxMarks?, allowLate,
              attachments: [fileId], publishedBy, publishedAt }
Submission  { assignmentId, studentId, text?, files: [fileId], submittedAt, isLate,
              marks?, feedback?, gradedBy?, gradedAt? }
```

**Estimate: 20–26 h** (file storage counted in the groundwork).

## 4. Exam schedule and other occasions

- **Admin / exam cell** publishes the exam timetable: subject, division, date, start and end time, room, and exam type (mid-sem, GTU external, practical viva).
- **Admin** keeps an **academic calendar**: holidays, college events, submission deadlines, "MOPEC" slots.
- **Student**: tab **Schedule**: the next exams and events for their division, as a list grouped by date (a calendar grid is optional).
- **Faculty**: their own invigilation or viva duties appear on their overview.
- Holidays from the calendar block starting lectures on those days.

```
ExamSlot { semesterId, divisionIds[], subjectId, type, date, start, end, room }
Event    { title, date, endDate?, kind: HOLIDAY | EVENT | DEADLINE, audience: ALL | DIVISION | ROLE }
```

**Estimate: 10–14 h.**

## 5. Timetable

From the GEC master timetable (6 periods a day, Monday–Saturday; theory per division; labs per batch in 2-period blocks; some combined classes):

- **Admin**: enter the weekly timetable: slot (day, period), division or batch, subject, teacher, room, number of periods. Optional later: import from a spreadsheet.
- **Faculty**: a **Today** list on their overview built from the timetable. "Start" pre-fills class, date and periods, so starting a lecture is one tap.
- **Student**: today's classes on their overview.
- **HOD**: lectures that were scheduled but not submitted, per teacher.

```
TimetableSlot { semesterId, day, period, periods, classId, subjectId, facultyId, room }
```

**Estimate: 14–20 h.**

## 6. Other features (from the gap list)

| Feature | Who | What | Est. |
| --- | --- | --- | --- |
| Attendance correction | Faculty → HOD | Request a change to a locked lecture with a reason; HOD approves; audit keeps the old value | 6–8 h |
| Change / forgot password | Everyone | Change in the account menu; "forgot password" sends a reset link (needs email) or admin resets it | 4–6 h (+ email setup) |
| Export | Faculty, HOD, admin | Attendance and marks to Excel/CSV per class | 4–6 h |
| Faculty leave and proxy lecture | Faculty → HOD | Teacher applies for leave; HOD approves and assigns a substitute who can take that class's attendance for those dates | 10–12 h |
| Submission monitoring | HOD | Lectures not submitted within N days, per teacher; marks not entered | 4–5 h |
| Detention list | HOD → exam cell | Students under 75% at term end, finalised by HOD, exported for the exam section | 4–6 h |
| Semester rollover | Admin | Close a semester, promote students, archive records read-only | 8–10 h |
| Department notices | HOD, admin | Short announcements to a department, division or role, shown on overviews | 5–7 h |
| Parent access | Parent | Read-only view of their child's attendance, marks and leave; linked by admin | 8–10 h |
| Email notifications | System | Send the in-app notifications by email too (needs an email service) | 4–6 h |
| GEC branding | All | College name, GTU affiliation and real department/division names on reports and screens | 2–3 h |
| Entry time limit | Faculty | Lectures can be entered at most N days late (the college picks N) | 1 h |

Not planned (out of scope unless asked): fees, hostel, library, QR or location-based attendance, a mobile app.

## 7. Suggested order

| Phase | Contents | Est. | Result |
| --- | --- | --- | --- |
| 1 | MongoDB; GEC branding; entry time limit | 15–22 h | Data survives restarts; looks like GEC |
| 2 | Semester/division/batch structure; subject allocation; notifications; file storage | 21–29 h | Real class structure; groundwork for everything else |
| 3 | **Marks** | 22–30 h | Your list: marks of exams and viva |
| 4 | **Assignments** | 20–26 h | Your list: publish assignments |
| 5 | **Exam schedule and calendar** | 10–14 h | Your list: schedule of exams and other occasions |
| 6 | Timetable and "today" | 14–20 h | Starting a lecture becomes one tap |
| 7 | Attendance correction, password change, export, submission monitoring, detention list | 22–31 h | HOD and admin workflows complete |
| 8 | Faculty leave + proxy, notices, rollover, parent access, email | 35–45 h | Nice to have |

Phases 1–5 cover everything in your own list, about **90–120 hours** in total. Phases 6–8 add about **70–95 hours**. All figures are estimates for one developer.

If the submission deadline is close, a reduced path is: phase 1 → a smaller phase 2 (no batches or combined classes yet, notifications only in-app) → phases 3–5. That is about 65–85 hours.

## 8. New tabs per role (after phases 1–5)

- **Student:** Overview · Attendance · Marks · Assignments · Schedule · Leave
- **Faculty:** Overview · Take attendance · Sessions · Marks · Assignments · Defaulters
- **HOD:** Overview · Approvals (leave + marks) · Defaulters · Allocation · Reports
- **Admin:** Overview · Users · Academic structure · Timetable · Exams & calendar · Bulk import · Reports · Audit log

## 9. Decisions needed before phase 3

1. **GTU assessment scheme** for GEC's 2026 BE syllabus: the components and maximum marks for theory and practical (for example mid-sem, progressive assessment, viva, term work). Needed for the default schemes.
2. **Do marks need HOD approval before students see them**, or can faculty publish directly?
3. **75% rule:** theory and practical checked separately, or combined per subject? This affects attendance and the detention list.
4. **Where will it run for real:** a college server (files stored on that server) or online hosting (files in a storage service)?
5. **Assignment files:** allowed types and size limit.
6. **Deadline:** when the project must be submitted, so the phases can be cut to fit.
