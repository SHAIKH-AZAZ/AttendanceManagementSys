'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMeta, type MetaSection } from '@/hooks/useMeta';
import type { PortalProps } from '@/lib/navigation';
import type { AttendanceRecord, AttendanceStatus, LectureSession, StudentComplianceStats } from '@/types';
import {
  ATTENDANCE_ORDER,
  ATTENDANCE_STATUS,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Modal,
  Notice,
  useTabNotice,
  PageHeader,
  ProgressBar,
  SegmentedControl,
  StatCard,
  StatusBadge,
  formatDate,
  inputClass,
  lectureName,
  selectClass,
} from '@/components/ui';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileClock,
  Lock,
  Save,
  Search,
  Users,
  XCircle,
} from 'lucide-react';

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
const pct = (s: LectureSession) =>
  s.summary.totalStudents ? Math.round((s.summary.presentCount / s.summary.totalStudents) * 100) : 0;

export const FacultyPortal: React.FC<PortalProps> = ({ activeTab, setActiveTab, onOpenUniversityReport }) => {
  const { user } = useAuth();
  const { meta, course, section, classLabel } = useMeta();

  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [compliance, setCompliance] = useState<Record<string, StudentComplianceStats[]>>({});
  const { notice, setNotice } = useTabNotice(activeTab);

  // Take-attendance state
  const [sectionId, setSectionId] = useState<string>('');
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const [pendingNav, setPendingNav] = useState<(() => void) | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>('ALL');
  const [newDate, setNewDate] = useState(today());
  const [newTitle, setNewTitle] = useState('');

  // Sessions tab filters
  const [sessionsClass, setSessionsClass] = useState<string>('ALL');
  const [sessionsState, setSessionsState] = useState<'ALL' | 'DRAFT' | 'LOCKED'>('ALL');
  const [defaultersClassId, setDefaultersClassId] = useState<string>('');

  const mySections = useMemo<MetaSection[]>(
    () => (meta?.sections ?? []).filter((s) => s.facultyId === user?.id),
    [meta, user?.id]
  );

  // Default the class picker to the first class once meta arrives.
  useEffect(() => {
    if (!sectionId && mySections[0]) setSectionId(mySections[0].id);
    if (!defaultersClassId && mySections[0]) setDefaultersClassId(mySections[0].id);
  }, [mySections, sectionId, defaultersClassId]);

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    if (res.ok) setSessions((await res.json()).sessions ?? []);
  }, []);

  const loadCompliance = useCallback(async (sections: MetaSection[]) => {
    const entries = await Promise.all(
      sections.map(async (s) => {
        const res = await fetch(`/api/compliance/defaulters?courseId=${s.courseId}&sectionId=${s.id}`);
        return [s.id, res.ok ? (await res.json()).stats ?? [] : []] as const;
      })
    );
    setCompliance(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (mySections.length) loadCompliance(mySections);
  }, [mySections, loadCompliance]);

  // Warn before closing the tab with unsaved marks.
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const sessionsFor = useCallback(
    (sid: string) => sessions.filter((s) => s.sectionId === sid).sort((a, b) => b.sessionNumber - a.sessionNumber),
    [sessions]
  );
  const draftFor = (sid: string) => sessions.find((s) => s.sectionId === sid && !s.isLocked);
  const openSession = sessions.find((s) => s.id === openSessionId) ?? null;

  /** Run `action` now, or after the user agrees to drop unsaved marks. */
  const guard = (action: () => void) => (dirty ? setPendingNav(() => action) : action());

  const openLecture = (s: LectureSession) => {
    setSectionId(s.sectionId);
    setOpenSessionId(s.id);
    setRecords(structuredClone(s.records));
    setDirty(false);
    setSearch('');
    setStatusFilter('ALL');
    setNotice(null);
  };

  /** Go to Take attendance for a class: continue its draft if there is one, otherwise show the start form. */
  const goTakeAttendance = (sid: string) =>
    guard(() => {
      const draft = draftFor(sid);
      if (draft) openLecture(draft);
      else {
        setSectionId(sid);
        setOpenSessionId(null);
        setDirty(false);
      }
      setNewDate(today());
      setNewTitle('');
      setActiveTab('faculty-attendance');
    });

  const startLecture = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, lectureDate: newDate, sessionTitle: newTitle }),
      });
      const data = await res.json();
      await loadSessions();
      if (res.status === 201) {
        openLecture(data.session);
        setNotice({ tone: 'success', text: 'Lecture started. Everyone is marked present; change the exceptions.' });
      } else if (res.status === 409 && data.draftId) {
        const draft = (await (await fetch(`/api/sessions/${data.draftId}`)).json()).session;
        if (draft) openLecture(draft);
        setNotice({ tone: 'info', text: 'This class already has an open draft, so it was opened instead.' });
      } else {
        setNotice({ tone: 'error', text: data.error || 'Could not start the lecture.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    setDirty(true);
  };
  const setRemark = (studentId: string, remarks: string) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r)));
    setDirty(true);
  };
  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    setDirty(true);
  };

  const copyPrevious = async () => {
    if (!openSession) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${openSession.id}/copy-previous`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records);
        setDirty(true);
        setNotice({ tone: 'info', text: 'Copied marks from the last locked lecture. Review, then save.' });
      } else setNotice({ tone: 'error', text: data.error || 'Nothing to copy.' });
    } finally {
      setBusy(false);
    }
  };

  const saveOrSubmit = async (kind: 'draft' | 'submit') => {
    if (!openSession) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${openSession.id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ tone: 'error', text: data.error || 'Something went wrong.' });
        return;
      }
      setDirty(false);
      setConfirmLock(false);
      await loadSessions();
      setRecords(structuredClone(data.session.records));
      if (kind === 'submit') {
        loadCompliance(mySections);
        setNotice({ tone: 'success', text: 'Attendance submitted and locked. Student percentages are updated.' });
      } else {
        setNotice({ tone: 'success', text: 'Draft saved. You can finish it later.' });
      }
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const c = Object.fromEntries(ATTENDANCE_ORDER.map((k) => [k, 0])) as Record<AttendanceStatus, number>;
    records.forEach((r) => c[r.status]++);
    return c;
  }, [records]);

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        (statusFilter === 'ALL' || r.status === statusFilter) &&
        (!q || r.studentName.toLowerCase().includes(q) || r.enrollmentNumber.toLowerCase().includes(q))
    );
  }, [records, search, statusFilter]);

  if (!meta) {
    return <Card><p className="text-sm text-slate-500">Loading your classes…</p></Card>;
  }

  if (mySections.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={BookOpen}
          title="No classes assigned yet"
          description="Ask the admin office to assign you to a course section. Your classes will appear here."
        />
      </Card>
    );
  }

  const defaulterTotal = mySections.reduce((n, s) => n + (compliance[s.id] ?? []).filter((x) => x.isDefaulter).length, 0);
  const drafts = sessions.filter((s) => !s.isLocked);
  const locked = sessions.filter((s) => s.isLocked);
  const currentSection = section(sectionId);

  return (
    <div>
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
          {notice.text}
        </Notice>
      )}

      {/* ------------------------------------------------------------ Overview */}
      {activeTab === 'faculty-overview' && (
        <>
          <PageHeader
            title={`Hello, ${user?.fullName}`}
            description={`You teach ${mySections.length} ${mySections.length === 1 ? 'class' : 'classes'} this term. Pick a class to take today's attendance.`}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Classes" value={mySections.length} icon={BookOpen} />
            <StatCard label="Lectures locked" value={locked.length} icon={Lock} />
            <StatCard
              label="Drafts waiting"
              value={drafts.length}
              tone={drafts.length ? 'warn' : 'neutral'}
              icon={FileClock}
              hint={drafts.length ? 'Submit them to count attendance' : 'All caught up'}
              onClick={drafts.length ? () => goTakeAttendance(drafts[0].sectionId) : undefined}
            />
            <StatCard
              label="Below 75%"
              value={defaulterTotal}
              tone={defaulterTotal ? 'bad' : 'good'}
              icon={AlertTriangle}
              hint="Students across your classes"
              onClick={() => setActiveTab('faculty-defaulters')}
            />
          </div>

          <h2 className="mt-8 mb-3 text-base font-semibold text-slate-800">Your classes</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySections.map((s) => {
              const c = course(s.courseId);
              const list = sessionsFor(s.id);
              const draft = list.find((x) => !x.isLocked);
              const last = list.find((x) => x.isLocked);
              const below = (compliance[s.id] ?? []).filter((x) => x.isDefaulter).length;
              return (
                <Card key={s.id} className="flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="accent">{c?.code}</Badge>
                    {draft ? <Badge tone="warn" icon={FileClock}>Draft open</Badge> : null}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-800">{c?.title}</h3>
                  <p className="text-sm text-slate-500">{s.name}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      ['Students', s.studentCount],
                      ['Lectures', list.filter((x) => x.isLocked).length],
                      ['Below 75%', below],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-slate-50 border border-slate-200 py-2">
                        <dt className="text-2xs text-slate-500">{k}</dt>
                        <dd className={`text-base font-bold ${k === 'Below 75%' && Number(v) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs text-slate-500">
                    {last ? `Last lecture ${formatDate(last.lectureDate)}` : 'No lectures yet'}
                  </p>
                  <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2 mt-auto">
                    <Button variant="primary" icon={ClipboardCheck} className="flex-1" onClick={() => goTakeAttendance(s.id)}>
                      {draft ? 'Continue draft' : 'Take attendance'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSessionsClass(s.id);
                        setActiveTab('faculty-sessions');
                      }}
                    >
                      Sessions
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ------------------------------------------------------ Take attendance */}
      {activeTab === 'faculty-attendance' && (
        <>
          <PageHeader
            title="Take attendance"
            description="Start a lecture, mark the exceptions, then submit. Submitted lectures are locked."
            actions={
              <select
                aria-label="Class"
                value={sectionId}
                onChange={(e) => goTakeAttendance(e.target.value)}
                className={`${selectClass} sm:min-w-64`}
              >
                {mySections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {classLabel(s.id)}
                  </option>
                ))}
              </select>
            }
          />

          {!openSession || openSession.sectionId !== sectionId ? (
            /* Start-lecture step */
            <Card className="max-w-xl">
              {currentSection && currentSection.studentCount === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No students in this class"
                  description="Students must be enrolled before attendance can be taken. Ask the admin office to import the roster."
                />
              ) : (
                <>
                  <CardHeader
                    title="Start a new lecture"
                    description={`${classLabel(sectionId)} · ${currentSection?.studentCount ?? 0} students`}
                  />
                  <div className="mt-5 grid sm:grid-cols-[10rem_1fr] gap-4">
                    <Field label="Date" htmlFor="lec-date">
                      <input id="lec-date" type="date" max={today()} value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Topic" htmlFor="lec-title" hint="Optional. Shown to students in their history.">
                      <input
                        id="lec-title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. AVL tree rotations"
                        maxLength={120}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {sessionsFor(sectionId)[0]
                        ? `Previous: Lecture ${sessionsFor(sectionId)[0].sessionNumber} on ${formatDate(sessionsFor(sectionId)[0].lectureDate)}`
                        : 'This will be the first lecture for this class.'}
                    </p>
                    <Button variant="primary" icon={CalendarPlus} loading={busy} disabled={!newDate} onClick={startLecture}>
                      Start lecture
                    </Button>
                  </div>
                </>
              )}
            </Card>
          ) : (
            /* Marking / read-only step */
            <Card padded={false}>
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-800">
                      {lectureName(openSession)}
                    </h2>
                    {openSession.isLocked ? (
                      <Badge icon={Lock}>Locked</Badge>
                    ) : (
                      <Badge tone="warn" icon={FileClock}>Draft</Badge>
                    )}
                    {dirty && <Badge tone="accent">Unsaved changes</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatDate(openSession.lectureDate)} · {classLabel(openSession.sectionId)}
                  </p>
                </div>
                {openSession.isLocked ? (
                  <Button variant="secondary" icon={draftFor(sectionId) ? ArrowLeft : CalendarPlus} onClick={() => goTakeAttendance(sectionId)}>
                    {draftFor(sectionId) ? 'Open draft' : 'Start next lecture'}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button icon={Save} loading={busy} disabled={!dirty} onClick={() => saveOrSubmit('draft')}>
                      Save draft
                    </Button>
                    <Button variant="primary" icon={Lock} disabled={busy || records.length === 0} onClick={() => setConfirmLock(true)}>
                      Submit and lock
                    </Button>
                  </div>
                )}
              </div>

              {openSession.isLocked && (
                <Notice tone="info" className="m-5 mb-0">
                  Submitted {openSession.submittedAt ? `on ${new Date(openSession.submittedAt).toLocaleString('en-IN')}` : 'earlier'}.
                  Locked lectures can&apos;t be edited; corrections go through the HOD.
                </Notice>
              )}

              {/* Counts */}
              <div className="p-5 grid grid-cols-3 sm:grid-cols-7 gap-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                  <div className="text-2xs text-slate-500">Total</div>
                  <div className="text-lg font-bold text-slate-800">{records.length}</div>
                </div>
                {ATTENDANCE_ORDER.map((k) => (
                  <button
                    key={k}
                    onClick={() => setStatusFilter(statusFilter === k ? 'ALL' : k)}
                    aria-pressed={statusFilter === k}
                    className={`rounded-lg border p-2 text-center transition-colors ${
                      statusFilter === k ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xs text-slate-500">{ATTENDANCE_STATUS[k].label}</div>
                    <div className="text-lg font-bold text-slate-800">{counts[k]}</div>
                  </button>
                ))}
              </div>

              <p className="sm:hidden px-5 -mt-2 pb-3 text-2xs text-slate-500">
                P present · A absent · L late · E excused · M medical · O on duty
              </p>

              {/* Toolbar */}
              <div className="px-5 pb-4 flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or roll number"
                    aria-label="Search students"
                    className={`${inputClass} pl-9`}
                  />
                </div>
                {!openSession.isLocked && (
                  <>
                    <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => markAll('PRESENT')}>
                      All present
                    </Button>
                    <Button variant="danger" size="sm" icon={XCircle} onClick={() => markAll('ABSENT')}>
                      All absent
                    </Button>
                    <Button size="sm" icon={Copy} disabled={busy} onClick={copyPrevious}>
                      Copy last lecture
                    </Button>
                  </>
                )}
              </div>

              {records.length === 0 ? (
                <EmptyState icon={Users} title="No students on this lecture" description="This class had no enrolled students when the lecture was created." />
              ) : visibleRecords.length === 0 ? (
                <EmptyState icon={Search} title="No students match" description="Clear the search or the status filter." />
              ) : (
                <>
                {/* Phones: one card per student, buttons below the name */}
                <ul className="sm:hidden divide-y divide-slate-100 border-t border-slate-200">
                  {visibleRecords.map((r) => (
                    <li key={r.studentId} className={`px-4 py-3 ${r.status === 'ABSENT' ? 'bg-rose-50/40' : ''}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-slate-800">{r.studentName}</span>
                        <span className="font-mono text-xs text-slate-500">{r.enrollmentNumber}</span>
                      </div>
                      {openSession.isLocked ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <StatusBadge status={r.status} />
                          {r.remarks && <span className="text-xs text-slate-500">{r.remarks}</span>}
                        </div>
                      ) : (
                        <div role="radiogroup" aria-label={`Status for ${r.studentName}`} className="mt-2 grid grid-cols-6 gap-1.5">
                          {ATTENDANCE_ORDER.map((k) => (
                            <button
                              key={k}
                              role="radio"
                              aria-checked={r.status === k}
                              aria-label={ATTENDANCE_STATUS[k].label}
                              onClick={() => setStatus(r.studentId, k)}
                              className={`h-10 rounded-md text-sm font-bold ${
                                r.status === k ? ATTENDANCE_STATUS[k].solid : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {ATTENDANCE_STATUS[k].short}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="hidden sm:block table-scroll border-t border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="py-2.5 px-5 font-semibold">Roll no.</th>
                        <th className="py-2.5 px-3 font-semibold">Student</th>
                        <th className="py-2.5 px-3 font-semibold">{openSession.isLocked ? 'Status' : 'Mark'}</th>
                        <th className="py-2.5 px-5 font-semibold">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleRecords.map((r) => (
                        <tr key={r.studentId} className={r.status === 'ABSENT' ? 'bg-rose-50/40' : ''}>
                          <td className="py-2.5 px-5 font-mono text-xs text-slate-600">{r.enrollmentNumber}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.studentName}</td>
                          <td className="py-2.5 px-3">
                            {openSession.isLocked ? (
                              <StatusBadge status={r.status} />
                            ) : (
                              <div role="radiogroup" aria-label={`Status for ${r.studentName}`} className="flex gap-1">
                                {ATTENDANCE_ORDER.map((k) => (
                                  <button
                                    key={k}
                                    role="radio"
                                    aria-checked={r.status === k}
                                    title={ATTENDANCE_STATUS[k].label}
                                    onClick={() => setStatus(r.studentId, k)}
                                    className={`w-8 h-8 rounded-md text-xs font-bold transition-colors ${
                                      r.status === k ? ATTENDANCE_STATUS[k].solid : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                  >
                                    {ATTENDANCE_STATUS[k].short}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-5">
                            {openSession.isLocked ? (
                              <span className="text-slate-500">{r.remarks || '—'}</span>
                            ) : (
                              <input
                                value={r.remarks ?? ''}
                                onChange={(e) => setRemark(r.studentId, e.target.value)}
                                placeholder="Optional"
                                aria-label={`Remark for ${r.studentName}`}
                                maxLength={200}
                                className={`${inputClass} h-8`}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}

              {/* Phones: keep the actions reachable at the bottom of a long roster */}
              {!openSession.isLocked && records.length > 0 && (
                <div className="sm:hidden sticky bottom-0 z-10 flex items-center gap-2 p-3 bg-white border-t border-slate-200 rounded-b-2xl">
                  <span className="flex-1 text-xs text-slate-600">
                    <strong className="text-emerald-700">{counts.PRESENT}</strong> P ·{' '}
                    <strong className="text-rose-600">{counts.ABSENT}</strong> A
                    {dirty && <span className="block text-brand-700">Unsaved</span>}
                  </span>
                  <Button size="sm" icon={Save} loading={busy} disabled={!dirty} onClick={() => saveOrSubmit('draft')}>
                    Save
                  </Button>
                  <Button size="sm" variant="primary" icon={Lock} disabled={busy} onClick={() => setConfirmLock(true)}>
                    Submit
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- Sessions */}
      {activeTab === 'faculty-sessions' && (
        <>
          <PageHeader title="Sessions" description="Every lecture you have started. Open one to view it or continue a draft." />
          <Card padded={false}>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
              <select aria-label="Class" value={sessionsClass} onChange={(e) => setSessionsClass(e.target.value)} className={selectClass}>
                <option value="ALL">All classes</option>
                {mySections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {classLabel(s.id)}
                  </option>
                ))}
              </select>
              <SegmentedControl
                label="Lecture state"
                value={sessionsState}
                onChange={setSessionsState}
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'DRAFT', label: 'Drafts', count: drafts.length },
                  { value: 'LOCKED', label: 'Locked', count: locked.length },
                ]}
              />
            </div>
            {(() => {
              const rows = sessions
                .filter((s) => sessionsClass === 'ALL' || s.sectionId === sessionsClass)
                .filter((s) => sessionsState === 'ALL' || (sessionsState === 'DRAFT' ? !s.isLocked : s.isLocked))
                .sort((a, b) => b.lectureDate.localeCompare(a.lectureDate) || b.sessionNumber - a.sessionNumber);
              if (!rows.length)
                return (
                  <EmptyState
                    icon={FileClock}
                    title="No lectures here yet"
                    description="Lectures you start from Take attendance will be listed here."
                    action={<Button variant="primary" icon={CalendarPlus} onClick={() => goTakeAttendance(sessionsClass === 'ALL' ? mySections[0].id : sessionsClass)}>Take attendance</Button>}
                  />
                );
              return (
                <div className="table-scroll">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold">Class</th>
                        <th className="py-2.5 px-3 font-semibold">Lecture</th>
                        <th className="py-2.5 px-3 font-semibold">Present</th>
                        <th className="py-2.5 px-3 font-semibold">State</th>
                        <th className="py-2.5 px-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{formatDate(s.lectureDate)}</td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{classLabel(s.sectionId)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {lectureName(s)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {s.summary.presentCount}/{s.summary.totalStudents} <span className="text-slate-400">({pct(s)}%)</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {s.isLocked ? <Badge icon={Lock}>Locked</Badge> : <Badge tone="warn" icon={FileClock}>Draft</Badge>}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant={s.isLocked ? 'ghost' : 'primary'}
                              onClick={() =>
                                guard(() => {
                                  openLecture(s);
                                  setActiveTab('faculty-attendance');
                                })
                              }
                            >
                              {s.isLocked ? 'View' : 'Continue'} <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </Card>
        </>
      )}

      {/* ----------------------------------------------------------- Defaulters */}
      {activeTab === 'faculty-defaulters' && (
        <>
          <PageHeader
            title="Defaulters"
            description="Students below the 75% attendance requirement, from locked lectures only."
            actions={
              <>
                <select aria-label="Class" value={defaultersClassId} onChange={(e) => setDefaultersClassId(e.target.value)} className={selectClass}>
                  {mySections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {classLabel(s.id)}
                    </option>
                  ))}
                </select>
                {section(defaultersClassId) && (
                  <Button icon={Award} onClick={() => onOpenUniversityReport(section(defaultersClassId)!.courseId, defaultersClassId)}>
                    Board report
                  </Button>
                )}
              </>
            }
          />
          {(() => {
            const stats = compliance[defaultersClassId] ?? [];
            if (!stats.length)
              return (
                <Card>
                  <EmptyState icon={CheckCircle2} title="No locked lectures yet" description="Percentages appear after the first lecture of this class is submitted." />
                </Card>
              );
            const below = stats.filter((s) => s.isDefaulter);
            return (
              <>
                <div className="grid grid-cols-3 gap-4 mb-5">
                  <StatCard label="Students" value={stats.length} />
                  <StatCard label="Below 75%" value={below.length} tone={below.length ? 'bad' : 'good'} />
                  <StatCard
                    label="Meeting 75%"
                    value={`${Math.round(((stats.length - below.length) / stats.length) * 100)}%`}
                    tone="good"
                  />
                </div>
                <Card padded={false}>
                  <div className="table-scroll">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Roll no.</th>
                          <th className="py-2.5 px-3 font-semibold">Student</th>
                          <th className="py-2.5 px-3 font-semibold">Attended</th>
                          <th className="py-2.5 px-3 font-semibold w-48">Attendance</th>
                          <th className="py-2.5 px-4 font-semibold">To reach 75%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.map((s) => (
                          <tr key={s.studentId} className={s.isDefaulter ? 'bg-rose-50/40' : ''}>
                            <td className="py-2.5 px-4 font-mono text-xs text-slate-600">{s.enrollmentNumber}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{s.fullName}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {s.attendedLectures}/{s.totalLectures}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-3">
                                <span className={`w-12 font-bold ${s.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}`}>{s.percentage}%</span>
                                <div className="flex-1"><ProgressBar value={s.percentage} /></div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {s.isDefaulter ? `${s.neededFor75} lectures in a row` : <span className="text-emerald-700">On track</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            );
          })()}
        </>
      )}

      {/* Lock confirmation */}
      <Modal
        open={confirmLock}
        onClose={() => setConfirmLock(false)}
        icon={Lock}
        title="Submit and lock this lecture?"
        description="Locked attendance can't be edited. Corrections need HOD approval."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLock(false)}>
              Keep editing
            </Button>
            <Button variant="primary" icon={Lock} loading={busy} onClick={() => saveOrSubmit('submit')}>
              Submit and lock
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-3 gap-2 text-center">
          {(['PRESENT', 'ABSENT', 'LATE'] as const).map((k) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-2xs text-slate-500">{ATTENDANCE_STATUS[k].label}</dt>
              <dd className="text-xl font-bold text-slate-800">{counts[k]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-slate-500">
          {records.length} students in total; {counts.EXCUSED + counts.MEDICAL_LEAVE + counts.ON_DUTY} excused, medical or on duty.
        </p>
      </Modal>

      {/* Unsaved-changes guard */}
      <Modal
        open={pendingNav !== null}
        onClose={() => setPendingNav(null)}
        icon={AlertTriangle}
        title="Discard unsaved marks?"
        description="You have marks on this lecture that aren't saved yet."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingNav(null)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const go = pendingNav;
                setPendingNav(null);
                setDirty(false);
                go?.();
              }}
            >
              Discard
            </Button>
          </>
        }
      />
    </div>
  );
};
