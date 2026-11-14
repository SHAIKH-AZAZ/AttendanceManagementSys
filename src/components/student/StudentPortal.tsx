'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { PortalProps } from '@/lib/navigation';
import type { AttendanceStatus, LeaveApplication, LeaveType } from '@/types';
import {
  ATTENDANCE_ORDER,
  ATTENDANCE_STATUS,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  LEAVE_TYPES,
  LeaveStatusBadge,
  Modal,
  Notice,
  useTabNotice,
  PageHeader,
  ProgressBar,
  StatCard,
  StatusBadge,
  formatDate,
  inputClass,
  lectureName,
  selectClass,
} from '@/components/ui';
import { BookOpen, CalendarPlus, FileText, History, Paperclip, Send } from 'lucide-react';

interface Summary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  overallPercentage: number;
  isCompliant: boolean;
  courses: {
    courseId: string;
    code: string;
    title: string;
    total: number;
    attended: number;
    percentage: number;
    isDefaulter: boolean;
  }[];
  history: {
    sessionId: string;
    lectureDate: string;
    courseCode: string;
    sessionNumber: number;
    sessionTitle: string;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

/** Lectures in a row needed to get back to 75%: (a + x) / (t + x) >= 0.75. */
const neededFor75 = (attended: number, total: number) =>
  Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));

const today = () => new Date().toLocaleDateString('en-CA');

export const StudentPortal: React.FC<PortalProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const { notice, setNotice } = useTabNotice(activeTab);

  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('MEDICAL');
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [historyCourse, setHistoryCourse] = useState('ALL');
  const [historyStatus, setHistoryStatus] = useState<AttendanceStatus | 'ALL'>('ALL');

  const load = useCallback(async () => {
    const res = await fetch('/api/student/summary');
    if (!res.ok) return;
    const json = await res.json();
    setData(json.summary);
    setLeaves(json.leaves ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openApply = () => {
    setLeaveType('MEDICAL');
    setStartDate(today());
    setEndDate(today());
    setReason('');
    setFileName('');
    setApplyOpen(true);
  };

  const dateError = endDate < startDate ? 'End date must be on or after the start date.' : null;

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dateError || !reason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
          documentUrl: fileName ? `/uploads/${fileName}` : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setApplyOpen(false);
        setNotice({ tone: 'success', text: 'Leave request sent to your HOD. You will see the decision here.', tab: 'student-leaves' });
        setActiveTab('student-leaves');
        load();
      } else {
        setNotice({ tone: 'error', text: json.error || 'Could not submit the request.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const history = useMemo(
    () =>
      (data?.history ?? []).filter(
        (h) =>
          (historyCourse === 'ALL' || h.courseCode === historyCourse) &&
          (historyStatus === 'ALL' || h.status === historyStatus)
      ),
    [data, historyCourse, historyStatus]
  );

  if (!data) {
    return <Card><p className="text-sm text-slate-500">Loading your attendance…</p></Card>;
  }

  const attended = data.presentCount + data.lateCount + data.excusedCount;
  const need = neededFor75(attended, data.totalSessions);
  const pending = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div>
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
          {notice.text}
        </Notice>
      )}

      {/* ------------------------------------------------------------ Overview */}
      {activeTab === 'student-overview' && (
        <>
          <PageHeader
            title={`Hello, ${user?.fullName}`}
            description={user?.studentProfile ? `Roll no. ${user.studentProfile.enrollmentNumber} · ${user.studentProfile.academicYear}` : undefined}
            actions={
              <Button variant="primary" icon={CalendarPlus} onClick={openApply}>
                Apply for leave
              </Button>
            }
          />

          {/* Standing */}
          <Card className="mb-5">
            {data.totalSessions === 0 ? (
              <EmptyState icon={BookOpen} title="No attendance yet" description="Your percentage appears after your first lecture is submitted by faculty." />
            ) : (
              <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-center">
                <div>
                  <div className="text-sm font-medium text-slate-500">Overall attendance</div>
                  <div className={`mt-1 text-5xl font-bold tracking-[-0.03em] ${data.isCompliant ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {data.overallPercentage}%
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={data.overallPercentage} />
                    <div className="mt-1.5 flex justify-between text-2xs text-slate-500">
                      <span>0%</span>
                      <span>75% required</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
                {data.isCompliant ? (
                  <Notice tone="success">
                    You meet the 75% requirement. {attended} of {data.totalSessions} lectures count as attended.
                  </Notice>
                ) : (
                  <Notice tone="error">
                    <strong>You are below 75%.</strong> Attend the next <strong>{need} lectures in a row</strong> to get back
                    above the line. If you missed lectures for a valid reason, apply for leave with proof.
                  </Notice>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Lectures" value={data.totalSessions} />
            <StatCard label="Present" value={data.presentCount} tone="good" />
            <StatCard label="Absent" value={data.absentCount} tone={data.absentCount ? 'bad' : 'neutral'} onClick={() => { setHistoryStatus('ABSENT'); setActiveTab('student-history'); }} />
            <StatCard
              label="Leave requests"
              value={pending}
              hint={pending ? 'Waiting for HOD' : 'None pending'}
              tone={pending ? 'warn' : 'neutral'}
              onClick={() => setActiveTab('student-leaves')}
            />
          </div>

          <h2 className="mt-8 mb-3 text-base font-semibold text-slate-800">By course</h2>
          {data.courses.length === 0 ? (
            <Card><EmptyState icon={BookOpen} title="No courses with attendance yet" /></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.courses.map((c) => (
                <Card key={c.courseId}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Badge tone="accent">{c.code}</Badge>
                      <h3 className="mt-2 font-semibold text-slate-800">{c.title}</h3>
                    </div>
                    <div className={`text-2xl font-bold ${c.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}`}>{c.percentage}%</div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={c.percentage} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {c.attended} of {c.total} attended
                    {c.isDefaulter && (
                      <span className="text-rose-600 font-semibold"> · needs {neededFor75(c.attended, c.total)} in a row</span>
                    )}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------ Lecture history */}
      {activeTab === 'student-history' && (
        <>
          <PageHeader title="Lecture history" description="Every submitted lecture and how you were marked." />
          <Card padded={false}>
            <div className="p-4 flex flex-wrap gap-3 border-b border-slate-200">
              <select aria-label="Course" value={historyCourse} onChange={(e) => setHistoryCourse(e.target.value)} className={selectClass}>
                <option value="ALL">All courses</option>
                {data.courses.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.title}
                  </option>
                ))}
              </select>
              <select
                aria-label="Status"
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value as AttendanceStatus | 'ALL')}
                className={selectClass}
              >
                <option value="ALL">All statuses</option>
                {ATTENDANCE_ORDER.map((k) => (
                  <option key={k} value={k}>
                    {ATTENDANCE_STATUS[k].label}
                  </option>
                ))}
              </select>
            </div>
            {history.length === 0 ? (
              <EmptyState icon={History} title="Nothing to show" description="No lectures match these filters." />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-3 font-semibold">Course</th>
                      <th className="py-2.5 px-3 font-semibold">Lecture</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.sessionId} className={h.status === 'ABSENT' ? 'bg-rose-50/40' : ''}>
                        <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{formatDate(h.lectureDate)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{h.courseCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{lectureName(h)}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={h.status} /></td>
                        <td className="py-2.5 px-4 text-slate-500">{h.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---------------------------------------------------------------- Leave */}
      {activeTab === 'student-leaves' && (
        <>
          <PageHeader
            title="Leave"
            description="When your HOD approves a request, your absences in that period are marked excused automatically."
            actions={
              <Button variant="primary" icon={CalendarPlus} onClick={openApply}>
                Apply for leave
              </Button>
            }
          />
          {leaves.length === 0 ? (
            <Card>
              <EmptyState
                icon={FileText}
                title="No leave requests"
                description="Apply when you miss lectures for a medical reason, college duty or an emergency."
                action={<Button variant="primary" icon={CalendarPlus} onClick={openApply}>Apply for leave</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {[...leaves]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((l) => (
                  <Card key={l.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{LEAVE_TYPES[l.leaveType].label} leave</h3>
                          <LeaveStatusBadge status={l.status} />
                          {l.documentUrl && <Badge icon={Paperclip}>Proof attached</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {formatDate(l.startDate)}
                          {l.endDate !== l.startDate && <> to {formatDate(l.endDate)}</>} · applied {formatDate(l.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{l.reason}</p>
                    {l.status !== 'PENDING' && l.reviewComments && (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                        <span className="font-semibold text-slate-700">HOD: </span>
                        <span className="text-slate-600">{l.reviewComments}</span>
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          )}
        </>
      )}

      {/* Apply for leave */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        icon={CalendarPlus}
        title="Apply for leave"
        description="Your HOD reviews the request. Approved leave excuses your absences in that period."
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Send} type="submit" form="leave-form" loading={submitting} disabled={!!dateError || !reason.trim()}>
              Send to HOD
            </Button>
          </>
        }
      >
        <form id="leave-form" onSubmit={submitLeave} className="space-y-4">
          <Field label="Type" htmlFor="leave-type" hint={LEAVE_TYPES[leaveType].hint}>
            <select id="leave-type" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)} className={inputClass}>
              {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((k) => (
                <option key={k} value={k}>
                  {LEAVE_TYPES[k].label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="leave-from">
              <input id="leave-from" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="To" htmlFor="leave-to">
              <input id="leave-to" type="date" required min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </Field>
          </div>
          {dateError && <p className="text-xs text-rose-600 -mt-2">{dateError}</p>}
          <Field label="Reason" htmlFor="leave-reason">
            <textarea
              id="leave-reason"
              required
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What happened, briefly"
              className={`${inputClass} h-auto py-2`}
            />
          </Field>
          <Field label="Proof (optional)" htmlFor="leave-file" hint="Only the file name is recorded for now; file storage isn't set up yet.">
            <input
              id="leave-file"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              className="block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
};
