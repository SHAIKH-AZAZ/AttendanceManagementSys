'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMeta } from '@/hooks/useMeta';
import type { PortalProps } from '@/lib/navigation';
import type { SystemAuditLog, User, UserRole } from '@/types';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Notice,
  useTabNotice,
  PageHeader,
  StatCard,
  inputClass,
  selectClass,
} from '@/components/ui';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Search,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { UserManagementTab } from './UserManagementTab';

interface ImportPreview {
  totalRecords: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  duplicates: { row: number; enrollmentNumber: string; reason: string }[];
  invalidRecords: { row: number; reason: string }[];
}

const SAMPLE_CSV = `CS-2026-101, Harshit Mehta, harshit.m@univ.edu
CS-2026-102, Riya Kapoor, riya.k@univ.edu
CS-2026-001, Duplicate Aarav, aarav.dupe@univ.edu
, Missing Roll Student, invalid@univ.edu
CS-2026-103, Tushar Saxena, tushar.s@univ.edu`;

const parseCsv = (text: string) =>
  text
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const [enrollmentNumber = '', fullName = '', email = ''] = line.split(',').map((p) => p.trim());
      return { enrollmentNumber, fullName, email };
    });

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const ROLE_LABEL: Record<UserRole, string> = {
  FACULTY: 'Faculty',
  STUDENT: 'Students',
  HOD: 'HODs',
  ADMIN_STAFF: 'Admin staff',
};

export const AdminPortal: React.FC<PortalProps> = ({ activeTab, setActiveTab, onOpenUniversityReport }) => {
  const { meta, course, classLabel } = useMeta();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const { notice, setNotice } = useTabNotice(activeTab);

  // Import
  const [importSectionId, setImportSectionId] = useState('');
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  // Audit
  const [auditQuery, setAuditQuery] = useState('');
  const [auditAction, setAuditAction] = useState('ALL');

  const load = useCallback(async () => {
    const [u, a] = await Promise.all([fetch('/api/admin/users'), fetch('/api/audit-logs')]);
    if (u.ok) setUsers((await u.json()).users ?? []);
    if (a.ok) setAuditLogs((await a.json()).logs ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh counts when coming back to the overview (users may have changed).
  useEffect(() => {
    if (activeTab === 'admin-overview' || activeTab === 'admin-audit') load();
  }, [activeTab, load]);

  useEffect(() => {
    if (!importSectionId && meta?.sections[0]) setImportSectionId(meta.sections[0].id);
  }, [meta, importSectionId]);

  const runImport = async (previewOnly: boolean) => {
    const students = parseCsv(importText);
    if (!students.length) return;
    setImporting(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: importSectionId, students, isPreviewOnly: previewOnly }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ tone: 'error', text: data.error || 'Import failed.' });
      } else if (previewOnly) {
        setPreview(data);
      } else {
        setNotice({ tone: 'success', text: data.message || 'Students imported.' });
        setImportText('');
        setPreview(null);
        load();
      }
    } finally {
      setImporting(false);
    }
  };

  const actions = useMemo(() => Array.from(new Set(auditLogs.map((l) => l.action))).sort(), [auditLogs]);
  const visibleLogs = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    return [...auditLogs]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .filter(
        (l) =>
          (auditAction === 'ALL' || l.action === auditAction) &&
          (!q || `${l.userName} ${l.details} ${l.entityName}`.toLowerCase().includes(q))
      );
  }, [auditLogs, auditQuery, auditAction]);

  const active = users.filter((u) => u.isActive);

  return (
    <div>
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
          {notice.text}
        </Notice>
      )}

      {/* ------------------------------------------------------------ Overview */}
      {activeTab === 'admin-overview' && (
        <>
          <PageHeader
            title="Administration"
            description="Accounts, class rosters, academic structure and the audit trail."
            actions={
              <>
                <Button icon={Upload} onClick={() => setActiveTab('admin-import')}>Import students</Button>
                <Button variant="primary" icon={UserPlus} onClick={() => setActiveTab('admin-users')}>Manage users</Button>
              </>
            }
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(['STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF'] as UserRole[]).map((r) => (
              <StatCard
                key={r}
                label={ROLE_LABEL[r]}
                value={active.filter((u) => u.role === r).length}
                hint="Active accounts"
                icon={Users}
                onClick={() => setActiveTab('admin-users')}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <StatCard label="Campuses" value={meta?.campuses.length ?? '—'} icon={Building2} onClick={() => setActiveTab('admin-structure')} />
            <StatCard label="Departments" value={meta?.departments.length ?? '—'} icon={Building2} onClick={() => setActiveTab('admin-structure')} />
            <StatCard label="Classes" value={meta?.sections.length ?? '—'} icon={BookOpen} onClick={() => setActiveTab('admin-reports')} />
            <StatCard
              label="Inactive accounts"
              value={users.length - active.length}
              tone={users.length - active.length ? 'warn' : 'neutral'}
              icon={AlertTriangle}
              onClick={() => setActiveTab('admin-users')}
            />
          </div>

          <Card className="mt-5" padded={false}>
            <div className="p-5 pb-3">
              <CardHeader
                title="Recent activity"
                actions={<Button size="sm" variant="ghost" onClick={() => setActiveTab('admin-audit')}>Full audit log</Button>}
              />
            </div>
            {auditLogs.length === 0 ? (
              <EmptyState icon={History} title="No activity yet" />
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-200">
                {[...auditLogs]
                  .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                  .slice(0, 6)
                  .map((l) => (
                    <li key={l.id} className="px-5 py-3 grid sm:grid-cols-[8rem_11rem_1fr] gap-x-3 gap-y-0.5 items-baseline">
                      <span className="text-xs text-slate-500 whitespace-nowrap">{when(l.timestamp)}</span>
                      <span className="text-sm font-semibold text-slate-800">{l.userName}</span>
                      <span className="text-sm text-slate-600 min-w-0 break-words">{l.details}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* --------------------------------------------------------------- Users */}
      {activeTab === 'admin-users' && <UserManagementTab />}

      {/* ------------------------------------------------- Academic structure */}
      {activeTab === 'admin-structure' && (
        <>
          <PageHeader title="Academic structure" description="Campuses, departments, courses and the classes taught this term." />
          {!meta ? (
            <Card><p className="text-sm text-slate-500">Loading…</p></Card>
          ) : (
            <div className="space-y-5">
              {meta.campuses.map((campus) => {
                const depts = meta.departments.filter((d) => d.campusId === campus.id);
                return (
                  <Card key={campus.id}>
                    <CardHeader
                      title={
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand-600" /> {campus.name}
                        </span>
                      }
                      description={campus.address}
                      actions={<Badge tone={campus.isActive ? 'good' : 'neutral'}>{campus.isActive ? 'Active' : 'Inactive'}</Badge>}
                    />
                    {depts.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">No departments.</p>
                    ) : (
                      <div className="mt-4 grid md:grid-cols-2 gap-3">
                        {depts.map((d) => {
                          const courses = meta.courses.filter((c) => c.departmentId === d.id);
                          return (
                            <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-slate-800">{d.name}</h4>
                                <Badge>{d.code}</Badge>
                              </div>
                              {courses.length === 0 ? (
                                <p className="mt-2 text-xs text-slate-500">No courses yet.</p>
                              ) : (
                                <ul className="mt-3 space-y-2">
                                  {courses.map((c) => {
                                    const secs = meta.sections.filter((s) => s.courseId === c.id);
                                    return (
                                      <li key={c.id} className="text-sm">
                                        <span className="font-mono text-xs text-slate-500 mr-2">{c.code}</span>
                                        <span className="text-slate-800">{c.title}</span>
                                        <span className="block text-xs text-slate-500 mt-0.5">
                                          {secs.length
                                            ? secs.map((s) => `${s.name} — ${s.facultyName}, ${s.studentCount} students`).join(' · ')
                                            : 'No classes scheduled'}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- Bulk import */}
      {activeTab === 'admin-import' && (
        <>
          <PageHeader
            title="Bulk import"
            description="Add students to a class roster from CSV. Rows are checked before anything is saved."
          />
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader title="1. Paste rows" description="One student per line: roll number, full name, email." />
              <div className="mt-4 space-y-4">
                <Field label="Class" htmlFor="import-class">
                  <select
                    id="import-class"
                    value={importSectionId}
                    onChange={(e) => {
                      setImportSectionId(e.target.value);
                      setPreview(null);
                    }}
                    className={inputClass}
                  >
                    {meta?.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {classLabel(s.id)} ({s.studentCount} students)
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="CSV rows" htmlFor="import-csv">
                  <textarea
                    id="import-csv"
                    rows={8}
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setPreview(null);
                    }}
                    placeholder="CS-2026-101, Harshit Mehta, harshit.m@univ.edu"
                    className={`${inputClass} h-auto py-2 font-mono text-xs`}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setImportText(SAMPLE_CSV);
                      setPreview(null);
                    }}
                  >
                    Load sample
                  </Button>
                  <Button icon={CheckCircle2} loading={importing && !preview} disabled={!importText.trim()} onClick={() => runImport(true)}>
                    Check rows
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="2. Review and import" description="No duplicate roll numbers are allowed within a class." />
              {!preview ? (
                <EmptyState icon={FileSpreadsheet} title="Nothing checked yet" description="Paste rows and choose Check rows to see what will be imported." />
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Rows', preview.totalRecords, 'text-slate-800'],
                      ['Ready', preview.validCount, 'text-emerald-700'],
                      ['Problems', preview.duplicateCount + preview.invalidCount, 'text-rose-600'],
                    ].map(([k, v, c]) => (
                      <div key={k as string} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="text-2xs text-slate-500">{k}</div>
                        <div className={`text-xl font-bold ${c}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {[...preview.duplicates.map((d) => ({ row: d.row, text: `${d.enrollmentNumber}: ${d.reason}`, icon: AlertTriangle, cls: 'text-amber-700' })),
                    ...preview.invalidRecords.map((d) => ({ row: d.row, text: d.reason, icon: XCircle, cls: 'text-rose-600' }))]
                    .sort((a, b) => a.row - b.row)
                    .map((p) => (
                      <div key={`${p.row}-${p.text}`} className="flex items-start gap-2 text-sm">
                        <p.icon className={`w-4 h-4 mt-0.5 shrink-0 ${p.cls}`} />
                        <span className="text-slate-700">
                          <strong>Row {p.row}</strong> — {p.text}
                        </span>
                      </div>
                    ))}
                  <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">Rows with problems are skipped.</span>
                    <Button variant="primary" icon={Upload} loading={importing} disabled={!preview.validCount} onClick={() => runImport(false)}>
                      Import {preview.validCount} {preview.validCount === 1 ? 'student' : 'students'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* -------------------------------------------------------------- Reports */}
      {activeTab === 'admin-reports' && (
        <>
          <PageHeader title="Reports" description="Examination-board eligibility report for any class. Only locked lectures are counted." />
          <Card padded={false}>
            {!meta?.sections.length ? (
              <EmptyState icon={Award} title="No classes" />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Course</th>
                      <th className="py-2.5 px-3 font-semibold">Class</th>
                      <th className="py-2.5 px-3 font-semibold">Faculty</th>
                      <th className="py-2.5 px-3 font-semibold">Students</th>
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {meta.sections.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs text-slate-500 mr-2">{course(s.courseId)?.code}</span>
                          <span className="font-semibold text-slate-800">{course(s.courseId)?.title}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{s.name}</td>
                        <td className="py-3 px-3 text-slate-600">{s.facultyName}</td>
                        <td className="py-3 px-3 text-slate-600">{s.studentCount}</td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" icon={Award} onClick={() => onOpenUniversityReport(s.courseId, s.id)}>
                            Open report
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ------------------------------------------------------------ Audit log */}
      {activeTab === 'admin-audit' && (
        <>
          <PageHeader title="Audit log" description="Sign-ins, attendance submissions, leave decisions and account changes. Entries can't be edited." />
          <Card padded={false}>
            <div className="p-4 flex flex-wrap gap-3 border-b border-slate-200">
              <div className="relative flex-1 min-w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Search person or details"
                  aria-label="Search audit log"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <select aria-label="Action" value={auditAction} onChange={(e) => setAuditAction(e.target.value)} className={selectClass}>
                <option value="ALL">All actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a.replaceAll('_', ' ').toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            {visibleLogs.length === 0 ? (
              <EmptyState icon={History} title="No matching entries" />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">When</th>
                      <th className="py-2.5 px-3 font-semibold">Who</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleLogs.map((l) => (
                      <tr key={l.id} className="align-top">
                        <td className="py-2.5 px-4 text-xs text-slate-500 whitespace-nowrap">{when(l.timestamp)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{l.userName}</td>
                        <td className="py-2.5 px-3">
                          <Badge>{l.action.replaceAll('_', ' ').toLowerCase()}</Badge>
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 min-w-72">{l.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
