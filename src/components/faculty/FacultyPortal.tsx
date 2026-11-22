'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMeta, type MetaSection } from '@/hooks/useMeta';
import { MarksTab } from './MarksTab';
import { AssignmentsTab } from './AssignmentsTab';
import { ScheduleTab } from '@/components/schedule/ScheduleTab';
import { AttendanceRoster } from './AttendanceRoster';
import type { PortalProps } from '@/lib/navigation';
import { ATTENDANCE_ENTRY_WINDOW_DAYS, daysBefore, todayIST } from '@/lib/rules';
import type { AttendanceRecord, AttendanceStatus, LectureSession, StudentComplianceStats } from '@/types';
import {
  ATTENDANCE_ORDER,
  ATTENDANCE_STATUS,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  Notice,
  useTabNotice,
  PageHeader,
  ProgressBar,
  SegmentedControl,
  StatCard,
  formatDate,
  lectureName,
  SelectField,
  DateInput,
} from '@/components/ui';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  FileClock,
  Lock,
  Save,
  Undo2,
  Users,
} from 'lucide-react';

const today = todayIST; // YYYY-MM-DD in India
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
  /** One-step undo for bulk changes (all present/absent, copy, quick entry). */
  const [undo, setUndo] = useState<{ records: AttendanceRecord[]; message: string } | null>(null);
  const [newDate, setNewDate] = useState(today());
  const [newTitle, setNewTitle] = useState('');
  const [newPeriods, setNewPeriods] = useState('1');

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
    setUndo(null);
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
      setNewPeriods(String(section(sid)?.defaultPeriods ?? 1));
      setActiveTab('faculty-attendance');
    });

  // Arriving at Take attendance for a class with an open draft: open the draft
  // instead of offering a new lecture (starting one would be refused anyway).
  useEffect(() => {
    if (activeTab !== 'faculty-attendance' || dirty) return;
    if (openSession?.sectionId === sectionId) return;
    const draft = sessions.find((s) => s.sectionId === sectionId && !s.isLocked);
    if (draft) openLecture(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openLecture is recreated each render
  }, [activeTab, sectionId, sessions, openSession, dirty]);

  const startLecture = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId, lectureDate: newDate, sessionTitle: newTitle, periods: Number(newPeriods) }),
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

  // A single change ends the Undo offer: undoing a bulk change afterwards would also revert it.
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    setUndo(null);
    setDirty(true);
  };
  const setRemark = (studentId: string, remarks: string) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r)));
    setUndo(null);
    setDirty(true);
  };
  /** Apply a bulk change and remember the marks before it, for Undo. */
  const bulk = (message: string, change: (r: AttendanceRecord) => AttendanceRecord) => {
    setUndo({ records, message });
    setRecords((prev) => prev.map(change));
    setDirty(true);
  };
  const markAll = (status: AttendanceStatus) =>
    bulk(`Marked everyone ${ATTENDANCE_STATUS[status].label.toLowerCase()}.`, (r) => ({ ...r, status }));
  const markMany = (ids: string[], status: AttendanceStatus, message: string) => {
    const set = new Set(ids);
    bulk(message, (r) => (set.has(r.studentId) ? { ...r, status } : r));
  };
  const undoBulk = () => {
    if (!undo) return;
    setRecords(undo.records);
    setUndo(null);
    setDirty(true);
  };

  const copyPrevious = async () => {
    if (!openSession) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${openSession.id}/copy-previous`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setUndo({ records, message: 'Copied marks from the last locked lecture. Review, then save.' });
        setRecords(data.records);
        setDirty(true);
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
      setUndo(null);
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
                  <p className="text-sm text-slate-500">
                    {s.name} · {s.kind === 'LAB' ? `Lab, ${s.defaultPeriods ?? 2} periods` : 'Theory'}
                  </p>
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
              <SelectField label="Subject · class" fullWidth={false} value={sectionId} onChange={goTakeAttendance} minWidth={320} options={mySections.map((s) => ({ value: s.id, label: classLabel(s.id) }))} />
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
                  <div className="mt-5 grid sm:grid-cols-[10rem_8rem_1fr] gap-4">
                    <DateInput
                      id="lec-date"
                      label="Date"
                      value={newDate}
                      onChange={setNewDate}
                      helperText={`Up to ${ATTENDANCE_ENTRY_WINDOW_DAYS} days back`}
                      max={today()}
                      min={daysBefore(today(), ATTENDANCE_ENTRY_WINDOW_DAYS)}
                    />
                    <SelectField
                      id="lec-periods"
                      label="Periods"
                      value={newPeriods}
                      onChange={setNewPeriods}
                      helperText={currentSection?.kind === 'LAB' ? 'Lab: usually 2' : 'Lab = 2'}
                      options={[
                        { value: '1', label: '1 period' },
                        { value: '2', label: '2 periods' },
                        { value: '3', label: '3 periods' },
                      ]}
                    />
                    <TextField
                      id="lec-title"
                      label="Topic"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. AVL tree rotations"
                      helperText="Optional. Shown to students in their history."
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 120 } }}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {sessionsFor(sectionId)[0]
                        ? `Last lecture: ${sessionsFor(sectionId)[0].sessionNumber} on ${formatDate(sessionsFor(sectionId)[0].lectureDate)}`
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
              <div className="p-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-800">{lectureName(openSession)}</h2>
                    {openSession.isLocked ? (
                      <Badge icon={Lock}>Locked</Badge>
                    ) : (
                      <Badge tone="warn" icon={FileClock}>Draft</Badge>
                    )}
                    <Badge>{openSession.periods} {openSession.periods === 1 ? 'period' : 'periods'}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {formatDate(openSession.lectureDate)} · {classLabel(openSession.sectionId)}
                  </p>
                </div>
                {openSession.isLocked && (
                  <Button variant="secondary" icon={draftFor(sectionId) ? ArrowLeft : CalendarPlus} onClick={() => goTakeAttendance(sectionId)}>
                    {draftFor(sectionId) ? 'Open draft' : 'Start next lecture'}
                  </Button>
                )}
              </div>

              {openSession.isLocked && (
                <Notice tone="info" className="mx-5 mb-4">
                  Submitted {openSession.submittedAt ? `on ${new Date(openSession.submittedAt).toLocaleString('en-IN')}` : 'earlier'}.
                  Locked lectures can&apos;t be edited; corrections go through the HOD.
                </Notice>
              )}

              <AttendanceRoster
                key={openSession.id}
                records={records}
                locked={openSession.isLocked}
                busy={busy}
                onStatus={setStatus}
                onRemark={setRemark}
                onMarkMany={markMany}
                onMarkAll={markAll}
                onCopyPrevious={copyPrevious}
              />

              {/* Save and submit stay reachable however long the roster is */}
              {!openSession.isLocked && records.length > 0 && (
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 bg-white/95 backdrop-blur border-t border-slate-200 rounded-b-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <p className="flex-1 min-w-[12rem] text-sm text-slate-600">
                    <strong className="text-emerald-700">{counts.PRESENT}</strong> present ·{' '}
                    <strong className="text-rose-600">{counts.ABSENT}</strong> absent
                    {records.length - counts.PRESENT - counts.ABSENT > 0 && (
                      <> · <strong className="text-slate-800">{records.length - counts.PRESENT - counts.ABSENT}</strong> other</>
                    )}
                    <span className="text-slate-400"> of {records.length}</span>
                    {dirty && <span className="block text-2xs font-semibold text-brand-700">Unsaved changes</span>}
                  </p>
                  {undo && (
                    <span className="flex items-center gap-1 text-sm text-slate-600">
                      <output>{undo.message}</output>
                      <Button size="sm" variant="ghost" icon={Undo2} onClick={undoBulk}>
                        Undo
                      </Button>
                    </span>
                  )}
                  <div className="flex gap-2">
                    <Button icon={Save} loading={busy} disabled={!dirty} onClick={() => saveOrSubmit('draft')}>
                      Save draft
                    </Button>
                    <Button variant="primary" icon={Lock} disabled={busy} onClick={() => setConfirmLock(true)}>
                      Submit and lock
                    </Button>
                  </div>
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
              <SelectField
                label="Subject · class" fullWidth={false}
                value={sessionsClass}
                onChange={setSessionsClass}
                minWidth={320}
                options={[{ value: 'ALL', label: 'All classes' }, ...mySections.map((s) => ({ value: s.id, label: classLabel(s.id) }))]}
              />
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
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Class</TableCell>
                        <TableCell>Lecture</TableCell>
                        <TableCell align="center">Periods</TableCell>
                        <TableCell>Present</TableCell>
                        <TableCell>State</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((s) => (
                        <TableRow key={s.id} className="hover:bg-slate-50">
                          <TableCell className="text-slate-600 whitespace-nowrap">{formatDate(s.lectureDate)}</TableCell>
                          <TableCell className="text-slate-600 min-w-56">{classLabel(s.sectionId)}</TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            {lectureName(s)}
                          </TableCell>
                          <TableCell align="center" className="text-slate-600">{s.periods ?? 1}</TableCell>
                          <TableCell className="text-slate-600 whitespace-nowrap">
                            {s.summary.presentCount}/{s.summary.totalStudents} <span className="text-slate-400">({pct(s)}%)</span>
                          </TableCell>
                          <TableCell>
                            {s.isLocked ? <Badge icon={Lock}>Locked</Badge> : <Badge tone="warn" icon={FileClock}>Draft</Badge>}
                          </TableCell>
                          <TableCell align="right">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
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
                <SelectField
                  label="Subject · class" fullWidth={false}
                  value={defaultersClassId}
                  onChange={setDefaultersClassId}
                  minWidth={320}
                  options={mySections.map((s) => ({ value: s.id, label: classLabel(s.id) }))}
                />
                {section(defaultersClassId) && (
                  <Button
                    icon={Award}
                    disabled={!(compliance[defaultersClassId] ?? []).length}
                    title={(compliance[defaultersClassId] ?? []).length ? undefined : 'Available after the first lecture is locked'}
                    onClick={() => onOpenUniversityReport(section(defaultersClassId)!.courseId, defaultersClassId)}
                  >
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
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 720 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Roll no.</TableCell>
                          <TableCell>Student</TableCell>
                          <TableCell>Attended</TableCell>
                          <TableCell className="w-48">Attendance</TableCell>
                          <TableCell>To reach 75%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {stats.map((s) => (
                          <TableRow key={s.studentId} className={s.isDefaulter ? 'bg-rose-50/40' : ''}>
                            <TableCell className="font-mono text-xs text-slate-600">{s.enrollmentNumber}</TableCell>
                            <TableCell className="font-semibold text-slate-800">{s.fullName}</TableCell>
                            <TableCell className="text-slate-600">
                              {s.attendedPeriods}/{s.totalPeriods}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <span className={`w-12 font-bold ${s.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}`}>{s.percentage}%</span>
                                <div className="flex-1"><ProgressBar value={s.percentage} /></div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600">
                              {s.isDefaulter ? `${s.neededFor75} periods in a row` : <span className="text-emerald-700">On track</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </>
            );
          })()}
        </>
      )}

      {activeTab === 'faculty-marks' && <MarksTab sections={mySections} classLabel={classLabel} notify={setNotice} />}
      {activeTab === 'faculty-assignments' && <AssignmentsTab sections={mySections} classLabel={classLabel} notify={setNotice} />}
      {activeTab === 'faculty-schedule' && <ScheduleTab description="Exams for the subjects you teach, holidays and college events." />}

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
