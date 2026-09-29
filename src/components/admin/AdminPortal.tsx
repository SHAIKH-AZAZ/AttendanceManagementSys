'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Search, Upload } from 'lucide-react';
import type { AcademicMeta, ImportPreview, SystemAuditLog } from '@/types';
import { api, formatDate, formatDateTime, humanize, plural, sectionLabel, useApi } from '@/lib/client';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  LoadState,
  Notice,
  PageHeader,
  Panel,
  Person,
  Stats,
  Table,
  buttonClass,
  cn,
  control,
  td,
  textareaClass,
  th,
  useToast,
} from '@/components/ui';
import { UserManagementTab } from './UserManagementTab';

const ROSTER_TEMPLATE = 'enrollment_number,full_name,email\nCS-2026-101,Harshit Mehta,harshit.mehta@univ.edu\n';

type RosterRow = { enrollmentNumber: string; fullName: string; email: string };

/** Parses "enrollment number, full name, email" lines; skips blank lines and a header row. */
function parseRoster(text: string): RosterRow[] {
  // ponytail: plain comma split; quoted fields that contain commas need a real CSV parser.
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"(.*)"$/, '$1')));
  if (rows[0] && /enrol|roll/i.test(rows[0][0])) rows.shift();
  return rows.map(([enrollmentNumber = '', fullName = '', email = '']) => ({ enrollmentNumber, fullName, email }));
}

interface AdminPortalProps {
  meta: AcademicMeta;
  reloadMeta: () => void;
  view: string;
  onOpenReport: (courseId: string, sectionId: string) => void;
}

export function AdminPortal({ meta, reloadMeta, view, onOpenReport }: AdminPortalProps) {
  if (view === 'import') return <RosterImport meta={meta} onImported={reloadMeta} />;
  if (view === 'reports') return <Reports meta={meta} onOpenReport={onOpenReport} />;
  if (view === 'users') return <UserManagementTab meta={meta} />;
  if (view === 'audit') return <AuditLog />;
  return <AcademicStructure meta={meta} />;
}

function AcademicStructure({ meta }: { meta: AcademicMeta }) {
  const activeTerm = meta.trimesters.find((t) => t.status === 'ACTIVE');
  return (
    <>
      <PageHeader
        title="Academic structure"
        description="Campuses, departments and the course sections running this term. Records are kept separate per department."
      />
      <Stats
        items={[
          { label: 'Campuses', value: meta.campuses.length },
          { label: 'Departments', value: meta.departments.length },
          { label: 'Courses', value: meta.courses.length },
          {
            label: 'Course sections',
            value: meta.sections.length,
            detail: activeTerm ? `Current term: ${activeTerm.name}` : undefined,
          },
        ]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {meta.campuses.map((campus) => {
          const departments = meta.departments.filter((d) => d.campusId === campus.id);
          return (
            <Panel key={campus.id} title={campus.name} description={campus.address}>
              {departments.length === 0 ? (
                <EmptyState title="No departments on this campus" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {departments.map((d) => {
                    const courses = meta.courses.filter((c) => c.departmentId === d.id).length;
                    const sections = meta.sections.filter((s) => s.departmentId === d.id).length;
                    return (
                      <li key={d.id} className="flex items-start justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500">
                            {d.code}, {plural(courses, 'course')}, {plural(sections, 'section')}
                          </p>
                        </div>
                        <Badge tone={d.isActive ? 'success' : 'neutral'}>{d.isActive ? 'Active' : 'Inactive'}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-6" title="Terms">
        <Table>
          <thead>
            <tr>
              <th className={th}>Term</th>
              <th className={th}>Academic year</th>
              <th className={th}>Dates</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {meta.trimesters.map((t) => (
              <tr key={t.id}>
                <td className={cn(td, 'font-medium text-slate-900')}>{t.name}</td>
                <td className={cn(td, 'tabular-nums')}>{t.academicSession}</td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
                  {formatDate(t.startDate)} to {formatDate(t.endDate)}
                </td>
                <td className={td}>
                  <Badge tone={t.status === 'ACTIVE' ? 'success' : 'neutral'}>{humanize(t.status)}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}

function RosterImport({ meta, onImported }: { meta: AcademicMeta; onImported: () => void }) {
  const notify = useToast();
  const [sectionId, setSectionId] = useState(meta.sections[0]?.id ?? '');
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<'validate' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => parseRoster(text), [text]);
  const section = meta.sections.find((s) => s.id === sectionId);

  // Any edit invalidates the previous validation.
  const change = (next: { text?: string; sectionId?: string }) => {
    if (next.text !== undefined) setText(next.text);
    if (next.sectionId !== undefined) setSectionId(next.sectionId);
    setPreview(null);
    setError(null);
  };

  async function send(isPreviewOnly: boolean) {
    setBusy(isPreviewOnly ? 'validate' : 'import');
    setError(null);
    try {
      const result = await api.post<ImportPreview & { message?: string; summary?: { successfullyImported: number } }>(
        '/api/admin/import',
        { sectionId, students: rows, isPreviewOnly }
      );
      if (isPreviewOnly) {
        setPreview(result);
      } else {
        notify(`Imported ${plural(result.summary?.successfullyImported ?? 0, 'student')} into ${section?.name ?? 'the section'}.`);
        setText('');
        setPreview(null);
        onImported();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const issues = preview
    ? [...preview.duplicates, ...preview.invalidRecords.map((r) => ({ ...r, enrollmentNumber: '' }))].sort(
        (a, b) => a.row - b.row
      )
    : [];

  return (
    <>
      <PageHeader
        title="Roster import"
        description="Add students to a course section from a CSV file. Rows are checked for missing fields and duplicate enrollment numbers before anything is saved."
        actions={
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(ROSTER_TEMPLATE)}`}
            download="roster-template.csv"
            className={buttonClass('secondary')}
          >
            <Download aria-hidden /> Download template
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Roster">
          <div className="space-y-4 px-5 py-4">
            {error && <Notice tone="danger">{error}</Notice>}
            <Field label="Section">
              <select value={sectionId} onChange={(e) => change({ sectionId: e.target.value })} className={control}>
                {meta.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sectionLabel(s, meta.courses)} ({plural(s.studentCount, 'student')})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CSV file" hint="Columns: enrollment number, full name, email. A header row is optional.">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) change({ text: await file.text() });
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-50"
              />
            </Field>
            <Field label="Rows" hint="Loaded from the file, or paste rows here.">
              <textarea
                rows={8}
                value={text}
                onChange={(e) => change({ text: e.target.value })}
                placeholder={'CS-2026-101, Harshit Mehta, harshit.mehta@univ.edu\nCS-2026-102, Riya Kapoor, riya.kapoor@univ.edu'}
                spellCheck={false}
                className={cn(textareaClass, 'tabular-nums')}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => send(true)}
                loading={busy === 'validate'}
                disabled={!rows.length || busy !== null}
              >
                Check {rows.length ? plural(rows.length, 'row') : 'rows'}
              </Button>
              <Button
                onClick={() => send(false)}
                loading={busy === 'import'}
                disabled={!preview?.validCount || busy !== null}
              >
                <Upload aria-hidden /> Import {preview?.validCount ? plural(preview.validCount, 'student') : 'students'}
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-2" title="Check results">
          {!preview ? (
            <EmptyState
              title="Nothing checked yet"
              description="Check the rows to see which students will be added and which rows need fixing."
            />
          ) : (
            <div className="space-y-4 px-5 py-4">
              <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 text-center">
                {[
                  ['Rows', preview.totalRecords],
                  ['Ready', preview.validCount],
                  ['Need fixing', preview.duplicateCount + preview.invalidCount],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white px-3 py-2">
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="text-lg font-semibold text-slate-900 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              {issues.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Rows that won’t be imported</h3>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                    {issues.map((issue) => (
                      <li key={`${issue.row}-${issue.reason}`} className="flex gap-3 px-3 py-2">
                        <span className="w-12 shrink-0 text-slate-500 tabular-nums">Row {issue.row}</span>
                        <span className="text-slate-800">
                          {issue.enrollmentNumber && <span className="font-medium tabular-nums">{issue.enrollmentNumber}: </span>}
                          {issue.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {preview.sampleValid.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-900">
                    Ready to import{preview.validCount > preview.sampleValid.length && ' (first 5)'}
                  </h3>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
                    {preview.sampleValid.map((s) => (
                      <li key={s.enrollmentNumber} className="px-3 py-2">
                        <Person name={s.fullName} detail={`${s.enrollmentNumber}, ${s.email}`} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

function Reports({ meta, onOpenReport }: { meta: AcademicMeta; onOpenReport: (courseId: string, sectionId: string) => void }) {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Printable statements of attendance and examination eligibility, one per course section, with signature blocks for the examination board."
      />
      <Panel>
        {meta.sections.length === 0 ? (
          <EmptyState title="No course sections yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Course</th>
                <th className={th}>Department</th>
                <th className={th}>Faculty</th>
                <th className={cn(th, 'text-right')}>Students</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meta.sections.map((s) => {
                const course = meta.courses.find((c) => c.id === s.courseId);
                return (
                  <tr key={s.id}>
                    <td className={cn(td, 'min-w-60')}>
                      <Person name={course ? `${course.code} ${course.title}` : s.courseId} detail={s.name} />
                    </td>
                    <td className={td}>{meta.departments.find((d) => d.id === s.departmentId)?.name}</td>
                    <td className={cn(td, 'whitespace-nowrap')}>{s.facultyName}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{s.studentCount}</td>
                    <td className={cn(td, 'text-right')}>
                      <Button variant="secondary" size="sm" onClick={() => onOpenReport(s.courseId, s.id)}>
                        <FileText aria-hidden /> Open report
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}

function AuditLog() {
  const q = useApi<{ logs: SystemAuditLog[] }>('/api/audit-logs');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('ALL');
  const logs = useMemo(() => q.data?.logs ?? [], [q.data]);
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const needle = search.trim().toLowerCase();
  const shown = logs.filter(
    (l) =>
      (action === 'ALL' || l.action === action) &&
      `${l.userName} ${l.details} ${l.entityName} ${l.entityId}`.toLowerCase().includes(needle)
  );

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Sign-ins, attendance submissions, leave decisions and account changes, newest first. Entries can’t be edited or removed."
        actions={
          <Button variant="secondary" onClick={q.reload} loading={q.loading && !!q.data}>
            Refresh
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-80">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, record or details"
              aria-label="Search the audit log"
              className={cn(control, 'pl-9')}
            />
          </div>
          <select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action" className={cn(control, 'sm:w-64')}>
            <option value="ALL">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {humanize(a)}
              </option>
            ))}
          </select>
          {q.data && (
            <p className="text-sm text-slate-500 sm:ml-auto">
              {shown.length === logs.length ? plural(logs.length, 'entry', 'entries') : `${shown.length} of ${logs.length}`}
            </p>
          )}
        </div>
        {!q.data ? (
          <LoadState error={q.error} onRetry={q.reload} />
        ) : shown.length === 0 ? (
          <EmptyState title="No entries match these filters" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Time</th>
                <th className={th}>User</th>
                <th className={th}>Action</th>
                <th className={th}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className={cn(td, 'whitespace-nowrap text-slate-600 tabular-nums')}>{formatDateTime(log.timestamp)}</td>
                  <td className={cn(td, 'whitespace-nowrap font-medium text-slate-900')}>{log.userName}</td>
                  <td className={cn(td, 'whitespace-nowrap')}>
                    <Badge>{humanize(log.action)}</Badge>
                  </td>
                  <td className={cn(td, 'min-w-80 text-slate-700')}>
                    {log.details}
                    <div className="mt-0.5 text-xs text-slate-500">
                      {log.entityName} {log.entityId}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
