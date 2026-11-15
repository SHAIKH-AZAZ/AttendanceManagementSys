'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
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
  Notice,
  useTabNotice,
  PageHeader,
  StatCard,
  SelectField,
  SearchField,
} from '@/components/ui';
import {
  LayoutGrid,
  Download,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { UserManagementTab } from './UserManagementTab';
import { AddClassDialog, AddSubjectDialog } from './StructureDialogs';
import { ScheduleAdminTab } from './ScheduleAdminTab';

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
  const { meta, course, classLabel, reload } = useMeta();
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [newLogins, setNewLogins] = useState<{ enrollmentNumber: string; fullName: string; email: string; tempPassword: string }[]>([]);
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
        setNewLogins(data.accounts ?? []);
        setImportText('');
        setPreview(null);
        load();
        reload();
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
          <PageHeader
            title="Academic structure"
            description="Campuses, departments, subjects and the classes taught this semester."
            actions={
              meta && (
                <>
                  <Button icon={BookOpen} onClick={() => setAddSubjectOpen(true)}>Add subject</Button>
                  <Button variant="primary" icon={LayoutGrid} disabled={!meta.courses.length} onClick={() => setAddClassOpen(true)}>
                    Add class
                  </Button>
                </>
              )
            }
          />
          {meta && (
            <>
              <AddSubjectDialog
                open={addSubjectOpen}
                onClose={() => setAddSubjectOpen(false)}
                meta={meta}
                onDone={(m) => {
                  setNotice({ tone: 'success', text: m });
                  reload();
                }}
              />
              <AddClassDialog
                open={addClassOpen}
                onClose={() => setAddClassOpen(false)}
                meta={meta}
                onDone={(m) => {
                  setNotice({ tone: 'success', text: m });
                  reload();
                }}
              />
            </>
          )}
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

      {activeTab === 'admin-schedule' && meta && <ScheduleAdminTab meta={meta} notify={setNotice} />}

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
              <div className="mt-4 flex flex-col gap-4">
                <SelectField
                  id="import-class"
                  label="Class"
                  value={importSectionId}
                  onChange={(v) => {
                    setImportSectionId(v);
                    setPreview(null);
                  }}
                  options={(meta?.sections ?? []).map((s) => ({ value: s.id, label: `${classLabel(s.id)} (${s.studentCount} students)` }))}
                />
                <TextField
                  id="import-csv"
                  label="CSV rows"
                  multiline
                  minRows={8}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setPreview(null);
                  }}
                  placeholder="CS-2026-101, Harshit Mehta, harshit.m@univ.edu"
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
                />
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
          {newLogins.length > 0 && (
            <Card className="mt-5">
              <CardHeader
                title={`${newLogins.length} new student logins`}
                description="Temporary passwords are shown only now and stored encrypted. Download them and give each student theirs privately."
                actions={
                  <>
                    <Button
                      icon={Download}
                      onClick={() => {
                        const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
                        const csv = ['Roll number,Name,Email,Temporary password', ...newLogins.map((a) => [a.enrollmentNumber, a.fullName, a.email, a.tempPassword].map(esc).join(','))].join('\n');
                        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                        const link = Object.assign(document.createElement('a'), { href: url, download: 'new-student-logins.csv' });
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Download CSV
                    </Button>
                    <Button variant="ghost" onClick={() => setNewLogins([])}>Done</Button>
                  </>
                }
              />
              <TableContainer className="mt-4">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Roll no.</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email (login)</TableCell>
                      <TableCell>Temporary password</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newLogins.map((a) => (
                      <TableRow key={a.email}>
                        <TableCell className="font-mono text-xs">{a.enrollmentNumber}</TableCell>
                        <TableCell>{a.fullName}</TableCell>
                        <TableCell>{a.email}</TableCell>
                        <TableCell className="font-mono">{a.tempPassword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
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
              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Course</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Faculty</TableCell>
                      <TableCell>Students</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meta.sections.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <span className="font-mono text-xs text-slate-500 mr-2">{course(s.courseId)?.code}</span>
                          <span className="font-semibold text-slate-800">{course(s.courseId)?.title}</span>
                        </TableCell>
                        <TableCell className="text-slate-600">{s.name}</TableCell>
                        <TableCell className="text-slate-600">{s.facultyName}</TableCell>
                        <TableCell className="text-slate-600">{s.studentCount}</TableCell>
                        <TableCell align="right">
                          <Button size="sm" icon={Award} onClick={() => onOpenUniversityReport(s.courseId, s.id)}>
                            Open report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
              <SearchField value={auditQuery} onChange={setAuditQuery} placeholder="Search person or details" ariaLabel="Search audit log" />
              <SelectField
                ariaLabel="Action"
                value={auditAction}
                onChange={setAuditAction}
                minWidth={200}
                options={[{ value: 'ALL', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: a.replaceAll('_', ' ').toLowerCase() }))]}
              />
            </div>
            {visibleLogs.length === 0 ? (
              <EmptyState icon={History} title="No matching entries" />
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Who</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleLogs.map((l) => (
                      <TableRow key={l.id} className="align-top">
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{when(l.timestamp)}</TableCell>
                        <TableCell className="font-semibold text-slate-800 whitespace-nowrap">{l.userName}</TableCell>
                        <TableCell>
                          <Badge>{l.action.replaceAll('_', ' ').toLowerCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 min-w-72">{l.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
