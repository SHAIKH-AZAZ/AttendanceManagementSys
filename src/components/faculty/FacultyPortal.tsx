'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, FileText, Lock, Plus, Save, Search } from 'lucide-react';
import type {
  AcademicMeta,
  AttendanceRecord,
  AttendanceStatus,
  ComplianceResponse,
  LectureSession,
  User,
} from '@/types';
import {
  api,
  attendanceRate,
  formatDate,
  formatDateTime,
  formatPercent,
  plural,
  sectionLabel,
  STATUSES,
  THRESHOLD,
  todayISO,
  useApi,
  type Tone,
} from '@/lib/client';
import {
  AttendanceValue,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  FormDialog,
  LoadState,
  Notice,
  PageHeader,
  Panel,
  Person,
  Stats,
  Table,
  cn,
  control,
  td,
  th,
  useToast,
} from '@/components/ui';

// Selected key colors: green counts as attended, amber is late, red absent, blue an authorized absence.
const CHECKED: Record<Tone, string> = {
  success: 'peer-checked:border-green-700 peer-checked:bg-green-700 peer-checked:text-white',
  danger: 'peer-checked:border-red-700 peer-checked:bg-red-700 peer-checked:text-white',
  warning: 'peer-checked:border-amber-700 peer-checked:bg-amber-700 peer-checked:text-white',
  info: 'peer-checked:border-sky-700 peer-checked:bg-sky-700 peer-checked:text-white',
  neutral: 'peer-checked:border-slate-700 peer-checked:bg-slate-700 peer-checked:text-white',
  brand: 'peer-checked:border-brand-700 peer-checked:bg-brand-700 peer-checked:text-white',
};

const KEY: Record<Tone, string> = {
  success: 'bg-green-700',
  danger: 'bg-red-700',
  warning: 'bg-amber-700',
  info: 'bg-sky-700',
  neutral: 'bg-slate-700',
  brand: 'bg-brand-700',
};

const TITLES: Record<string, string> = {
  attendance: 'Mark attendance',
  sessions: 'Session history',
  compliance: 'Compliance',
};

/** True when both lists hold the same mark and remark for every student. */
function sameMarks(a: AttendanceRecord[], b: AttendanceRecord[]) {
  const saved = new Map(b.map((r) => [r.studentId, r]));
  return (
    a.length === b.length &&
    a.every((r) => {
      const s = saved.get(r.studentId);
      return s?.status === r.status && (s.remarks ?? '') === (r.remarks ?? '');
    })
  );
}

interface FacultyPortalProps {
  user: User;
  meta: AcademicMeta;
  view: string;
  onNavigate: (view: string) => void;
  onOpenReport: (courseId: string, sectionId: string) => void;
}

export function FacultyPortal({ user, meta, view, onNavigate, onOpenReport }: FacultyPortalProps) {
  const notify = useToast();

  const sections = useMemo(
    () =>
      meta.sections.filter(
        (s) => s.facultyId === user.id || user.facultyProfile?.assignedCourses.some((a) => a.sectionId === s.id)
      ),
    [meta.sections, user]
  );
  const [sectionId, setSectionId] = useState(sections[0]?.id);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const course = meta.courses.find((c) => c.id === section?.courseId);
  const query = section ? `courseId=${section.courseId}&sectionId=${section.id}` : null;

  const sessionsQ = useApi<{ sessions: LectureSession[] }>(query && `/api/sessions?${query}`);
  const complianceQ = useApi<ComplianceResponse>(query && `/api/compliance/defaulters?${query}`);
  const sessions = useMemo(
    () => [...(sessionsQ.data?.sessions ?? [])].sort((a, b) => b.sessionNumber - a.sessionNumber),
    [sessionsQ.data]
  );

  // Default to the open draft; otherwise the most recent session.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const session = sessions.find((s) => s.id === pickedId) ?? sessions.find((s) => !s.isLocked) ?? sessions[0];

  // Unsaved marks live here until saved; the server copy stays in `session.records`.
  const [draft, setDraft] = useState<{ sessionId: string; records: AttendanceRecord[] } | null>(null);
  const records = session ? (draft?.sessionId === session.id ? draft.records : session.records) : [];
  const dirty = !!session && !session.isLocked && !sameMarks(records, session.records);

  // Ask before a reload or tab close throws away unsaved marks.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const [confirm, setConfirm] = useState<{ kind: 'submit' } | { kind: 'discard'; then: () => void } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<'save' | 'submit' | 'copy' | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL');

  /** Runs `action` now, or after the user agrees to drop unsaved marks. */
  const guard = (action: () => void) => {
    if (dirty) setConfirm({ kind: 'discard', then: action });
    else action();
  };

  const update = (change: (record: AttendanceRecord) => AttendanceRecord) => {
    if (!session || session.isLocked) return;
    setDraft({ sessionId: session.id, records: records.map(change) });
  };
  const mark = (studentId: string | null, status: AttendanceStatus) =>
    update((r) => (studentId === null || r.studentId === studentId ? { ...r, status, markedAt: new Date().toISOString() } : r));

  async function run(kind: 'save' | 'submit' | 'copy', task: () => Promise<string>) {
    setBusy(kind);
    try {
      notify(await task());
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  const saveDraft = (target: LectureSession) =>
    run('save', async () => {
      await api.post(`/api/sessions/${target.id}/draft`, { records });
      sessionsQ.reload();
      return 'Draft saved.';
    });

  const submit = (target: LectureSession) =>
    run('submit', async () => {
      await api.post(`/api/sessions/${target.id}/submit`, { facultyId: user.id, records });
      sessionsQ.reload();
      complianceQ.reload();
      return `Session ${target.sessionNumber} submitted and locked.`;
    });

  const copyPrevious = (target: LectureSession) =>
    run('copy', async () => {
      const data = await api.post<{ records: AttendanceRecord[] }>(`/api/sessions/${target.id}/copy-previous`);
      setDraft({ sessionId: target.id, records: data.records });
      sessionsQ.reload();
      return 'Marks copied from the most recent locked session.';
    });

  const nextNumber = (sessions[0]?.sessionNumber ?? 0) + 1;

  async function createSession(data: FormData) {
    if (!section) return;
    const topic = String(data.get('topic') ?? '').trim();
    const { session: created } = await api.post<{ session: LectureSession }>('/api/sessions', {
      campusId: section.campusId,
      departmentId: section.departmentId,
      trimesterId: section.trimesterId,
      courseId: section.courseId,
      sectionId: section.id,
      facultyId: user.id,
      lectureDate: data.get('date'),
      sessionNumber: nextNumber,
      sessionTitle: topic || `Lecture ${nextNumber}`,
    });
    setPickedId(created.id);
    sessionsQ.reload();
    notify(`Session ${nextNumber} created.`);
  }

  if (!section || !course) {
    return (
      <>
        <PageHeader title={TITLES[view]} />
        <Panel>
          <EmptyState
            title="No course sections are assigned to you"
            description="Ask the academic office to assign you to a section before recording attendance."
          />
        </Panel>
      </>
    );
  }

  const context = `${course.code} ${course.title}, ${section.name}. ${plural(section.studentCount, 'student')} enrolled.`;

  const sectionPicker = sections.length > 1 && (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-600">Section</span>
      <select
        value={section.id}
        onChange={(e) => {
          const id = e.target.value;
          guard(() => {
            setSectionId(id);
            setPickedId(null);
          });
        }}
        className={cn(control, 'w-auto max-w-72')}
      >
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {`${meta.courses.find((c) => c.id === s.courseId)?.code ?? s.courseId}, ${s.name}`}
          </option>
        ))}
      </select>
    </label>
  );

  const reportButton = (
    <Button variant="secondary" onClick={() => onOpenReport(section.courseId, section.id)}>
      <FileText aria-hidden /> Attendance report
    </Button>
  );

  if (view === 'sessions') {
    return (
      <>
        <PageHeader title="Session history" description={context} actions={<>{sectionPicker}{reportButton}</>} />
        <Panel>
          {!sessionsQ.data ? (
            <LoadState error={sessionsQ.error} onRetry={sessionsQ.reload} />
          ) : sessions.length === 0 ? (
            <EmptyState title="No sessions yet" description="Sessions you create for this section are listed here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>No.</th>
                  <th className={th}>Date</th>
                  <th className={th}>Topic</th>
                  <th className={cn(th, 'text-right')}>Attended</th>
                  <th className={cn(th, 'text-right')}>Rate</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className={cn(td, 'text-slate-500 tabular-nums')}>{s.sessionNumber}</td>
                    <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatDate(s.lectureDate)}</td>
                    <td className={cn(td, 'min-w-60 font-medium text-slate-900')}>{s.sessionTitle}</td>
                    <td className={cn(td, 'text-right whitespace-nowrap tabular-nums')}>
                      {s.records.filter((r) => r.status !== 'ABSENT').length} of {s.records.length}
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>{formatPercent(attendanceRate(s.records))}</td>
                    <td className={td}>
                      {s.isLocked ? (
                        <Badge>
                          <Lock aria-hidden /> Locked
                        </Badge>
                      ) : (
                        <Badge tone="warning">Draft</Badge>
                      )}
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          guard(() => {
                            setPickedId(s.id);
                            onNavigate('attendance');
                          })
                        }
                      >
                        {s.isLocked ? 'View marks' : 'Continue marking'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        {confirm?.kind === 'discard' && (
          <DiscardDialog onClose={() => setConfirm(null)} onDiscard={() => { setDraft(null); confirm.then(); }} />
        )}
      </>
    );
  }

  if (view === 'compliance') {
    const stats = complianceQ.data?.stats ?? [];
    const below = stats.filter((s) => s.isDefaulter).length;
    const average = stats.length ? stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length : 0;
    return (
      <>
        <PageHeader
          title="Compliance"
          description={`${context} Late, excused, medical leave and on-duty marks count as attended. Only locked sessions are included.`}
          actions={<>{sectionPicker}{reportButton}</>}
        />
        {!complianceQ.data ? (
          <Panel>
            <LoadState error={complianceQ.error} onRetry={complianceQ.reload} />
          </Panel>
        ) : stats.length === 0 ? (
          <Panel>
            <EmptyState
              title="No locked sessions yet"
              description="Figures appear once the first session for this section is submitted."
            />
          </Panel>
        ) : (
          <>
            <Stats
              items={[
                {
                  label: 'Students',
                  value: stats.length,
                  detail: plural(Math.max(...stats.map((s) => s.totalLectures)), 'locked session'),
                },
                {
                  label: `At or above ${THRESHOLD}%`,
                  value: stats.length - below,
                  detail: `${formatPercent(complianceQ.data.complianceRate)} of the section`,
                },
                { label: `Below ${THRESHOLD}%`, value: below, alert: below > 0 },
                { label: 'Section average', value: formatPercent(average) },
              ]}
            />
            <Panel className="mt-6" title="Students" description="Lowest attendance first.">
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Student</th>
                    <th className={cn(th, 'text-right')}>Attended</th>
                    <th className={th}>Attendance</th>
                    <th className={th}>Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.map((s) => (
                    <tr key={s.studentId}>
                      <td className={td}>
                        <Person name={s.fullName} detail={s.enrollmentNumber} />
                      </td>
                      <td className={cn(td, 'text-right whitespace-nowrap tabular-nums')}>
                        {s.attendedLectures} of {s.totalLectures}
                      </td>
                      <td className={td}>
                        <AttendanceValue value={s.percentage} />
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        {s.isDefaulter ? (
                          <span className="flex items-center gap-2">
                            <Badge tone="danger">Below {THRESHOLD}%</Badge>
                            <span className="text-slate-600">
                              Needs {plural(s.neededFor75, 'consecutive lecture')}
                            </span>
                          </span>
                        ) : (
                          <Badge tone="success">Meets {THRESHOLD}%</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </>
        )}
      </>
    );
  }

  // Default view: mark attendance.
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s.value, records.filter((r) => r.status === s.value).length])
  ) as Record<AttendanceStatus, number>;
  const needle = search.trim().toLowerCase();
  const rows = records
    .map((record, index) => ({ record, number: index + 1 }))
    .filter(
      ({ record }) =>
        (statusFilter === 'ALL' || record.status === statusFilter) &&
        `${record.studentName} ${record.enrollmentNumber}`.toLowerCase().includes(needle)
    );
  const hasPrevious = sessions.some((s) => s.isLocked && s.id !== session?.id);

  return (
    <>
      <PageHeader
        title="Mark attendance"
        description={context}
        actions={
          <>
            {sectionPicker}
            <Button onClick={() => guard(() => setCreating(true))}>
              <Plus aria-hidden /> New session
            </Button>
          </>
        }
      />

      {!sessionsQ.data ? (
        <Panel>
          <LoadState error={sessionsQ.error} onRetry={sessionsQ.reload} />
        </Panel>
      ) : !session ? (
        <Panel>
          <EmptyState
            title="No sessions yet"
            description="Create a session for today’s lecture to start recording attendance."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus aria-hidden /> New session
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{session.sessionTitle}</h2>
                {session.isLocked ? (
                  <Badge>
                    <Lock aria-hidden /> Locked
                  </Badge>
                ) : (
                  <Badge tone="warning">Draft</Badge>
                )}
                {dirty && <Badge tone="brand">Unsaved changes</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-slate-600">
                Session {session.sessionNumber}, {formatDate(session.lectureDate)}
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <span className="text-slate-600">Session</span>
              <select
                value={session.id}
                onChange={(e) => {
                  const id = e.target.value;
                  guard(() => setPickedId(id));
                }}
                className={cn(control, 'w-auto')}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {`Session ${s.sessionNumber}, ${formatDate(s.lectureDate)}${s.isLocked ? '' : ' (draft)'}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {session.isLocked ? (
            <div className="border-b border-slate-200 px-5 py-3">
              <Notice>
                {session.submittedAt && <>Submitted {formatDateTime(session.submittedAt)}. </>}
                Locked marks can’t be edited. They change only when the head of department approves leave that covers
                this date.
              </Notice>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-5 py-3">
              <Button variant="secondary" size="sm" onClick={() => mark(null, 'PRESENT')}>
                Mark all present
              </Button>
              <Button variant="secondary" size="sm" onClick={() => mark(null, 'ABSENT')}>
                Mark all absent
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyPrevious(session)}
                loading={busy === 'copy'}
                disabled={!hasPrevious || busy !== null}
                title={hasPrevious ? undefined : 'No locked session to copy from'}
              >
                <Copy aria-hidden /> Copy previous session
              </Button>
              <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => saveDraft(session)}
                  loading={busy === 'save'}
                  disabled={!dirty || busy !== null}
                >
                  <Save aria-hidden /> Save draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirm({ kind: 'submit' })}
                  loading={busy === 'submit'}
                  disabled={busy !== null}
                >
                  <Lock aria-hidden /> Submit and lock
                </Button>
              </div>
            </div>
          )}

          <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm">
            {STATUSES.map((s) => (
              <div key={s.value} className="flex items-center gap-1.5">
                <dt className="flex items-center gap-1.5 text-slate-600">
                  <span
                    aria-hidden
                    className={cn('grid size-5 place-items-center rounded text-xs font-semibold text-white', KEY[s.tone])}
                  >
                    {s.code}
                  </span>
                  {s.label}
                </dt>
                <dd className="font-semibold text-slate-900 tabular-nums">{counts[s.value]}</dd>
              </div>
            ))}
            <div className="flex items-center gap-1.5 sm:ml-auto">
              <dt className="text-slate-600">Attendance</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{formatPercent(attendanceRate(records))}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or roll number"
                aria-label="Search students"
                className={cn(control, 'pl-9')}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | 'ALL')}
              aria-label="Filter by mark"
              className={cn(control, 'sm:w-44')}
            >
              <option value="ALL">All marks</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 sm:ml-auto">
              {rows.length === records.length
                ? plural(records.length, 'student')
                : `${rows.length} of ${plural(records.length, 'student')}`}
            </p>
          </div>

          <Table>
            <thead>
              <tr>
                <th className={cn(th, 'hidden w-14 sm:table-cell')}>No.</th>
                <th className={th}>Student</th>
                <th className={th}>Mark</th>
                <th className={cn(th, 'min-w-52')}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ record, number }) => (
                <tr key={record.studentId} className={cn(record.status === 'ABSENT' && 'bg-red-50/60')}>
                  <td className={cn(td, 'hidden text-slate-500 tabular-nums sm:table-cell')}>{number}</td>
                  <td className={td}>
                    <Person name={record.studentName} detail={record.enrollmentNumber} />
                  </td>
                  <td className={td}>
                    <MarkPicker
                      record={record}
                      disabled={session.isLocked}
                      onChange={(status) => mark(record.studentId, status)}
                    />
                  </td>
                  <td className={td}>
                    <input
                      value={record.remarks ?? ''}
                      disabled={session.isLocked}
                      onChange={(e) =>
                        update((r) => (r.studentId === record.studentId ? { ...r, remarks: e.target.value } : r))
                      }
                      placeholder={session.isLocked ? '' : 'Optional'}
                      aria-label={`Remarks for ${record.studentName}`}
                      className={cn(control, 'h-8')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {rows.length === 0 && <EmptyState title="No students match these filters" />}
        </Panel>
      )}

      {creating && (
        <FormDialog
          title="New session"
          description={sectionLabel(section, meta.courses)}
          submitLabel="Create session"
          onClose={() => setCreating(false)}
          onSubmit={createSession}
        >
          <Field label="Lecture date">
            <input type="date" name="date" required defaultValue={todayISO()} className={control} />
          </Field>
          <Field label="Topic" hint="Optional. Shown in session history.">
            <input name="topic" maxLength={120} placeholder={`Lecture ${nextNumber}`} className={control} />
          </Field>
          <p className="text-sm text-slate-600">
            All {plural(section.studentCount, 'student')} start as present. Adjust marks before you submit.
          </p>
        </FormDialog>
      )}

      {confirm?.kind === 'submit' && session && (
        <ConfirmDialog
          title="Submit and lock this session?"
          confirmLabel="Submit and lock"
          onClose={() => setConfirm(null)}
          onConfirm={() => submit(session)}
        >
          <p>
            Session {session.sessionNumber}, {formatDate(session.lectureDate)}. After submission the marks can’t be
            edited, and each student’s attendance percentage is recalculated.
          </p>
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-center">
            {[
              ['Attended', records.length - counts.ABSENT],
              ['Absent', counts.ABSENT],
              ['Enrolled', records.length],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-3 py-2">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="text-lg font-semibold text-slate-900 tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {dirty && <p>Your unsaved changes are included in the submission.</p>}
        </ConfirmDialog>
      )}

      {confirm?.kind === 'discard' && (
        <DiscardDialog onClose={() => setConfirm(null)} onDiscard={() => { setDraft(null); confirm.then(); }} />
      )}
    </>
  );
}

function DiscardDialog({ onClose, onDiscard }: { onClose: () => void; onDiscard: () => void }) {
  return (
    <ConfirmDialog
      title="Discard unsaved marks?"
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      variant="danger"
      onClose={onClose}
      onConfirm={onDiscard}
    >
      <p>Marks you changed in this session haven’t been saved. Save a draft first to keep them.</p>
    </ConfirmDialog>
  );
}

/** One radio group per student: arrow keys move between marks, as with any native radio group. */
function MarkPicker({
  record,
  disabled,
  onChange,
}: {
  record: AttendanceRecord;
  disabled: boolean;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <fieldset disabled={disabled} className="flex gap-1">
      <legend className="sr-only">Mark for {record.studentName}</legend>
      {STATUSES.map((s) => (
        <label key={s.value} title={s.label}>
          <input
            type="radio"
            name={`mark-${record.studentId}`}
            value={s.value}
            checked={record.status === s.value}
            onChange={() => onChange(s.value)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={cn(
              'grid size-7 cursor-pointer place-items-center rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-600 transition-colors sm:size-8',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-40',
              CHECKED[s.tone],
              'peer-checked:peer-disabled:opacity-100'
            )}
          >
            {s.code}
          </span>
          <span className="sr-only">{s.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
