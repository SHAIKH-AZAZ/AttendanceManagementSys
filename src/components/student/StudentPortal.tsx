'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MuiButton from '@mui/material/Button';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StudentMarksTab } from './MarksTab';
import { StudentAssignmentsTab } from './AssignmentsTab';
import { ScheduleTab } from '@/components/schedule/ScheduleTab';
import type { PortalProps } from '@/lib/navigation';
import type { AttendanceStatus, LeaveApplication, LeaveType } from '@/types';
import {
  ATTENDANCE_ORDER,
  ATTENDANCE_STATUS,
  Badge,
  Button,
  Card,
  EmptyState,
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
  lectureName,
  SelectField,
  DateInput,
} from '@/components/ui';
import { BookOpen, CalendarPlus, FileText, History, Paperclip, Send } from 'lucide-react';

interface Summary {
  /** All counts are in timetable periods (a 2-period lab adds 2). */
  totalPeriods: number;
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
    periods: number;
    isLab: boolean;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

/** Periods in a row needed to get back to 75%: (a + x) / (t + x) >= 0.75. */
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
  const [proof, setProof] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
    setProof(null);
    setUploadError(null);
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
          fileId: proof?.id,
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
  const need = neededFor75(attended, data.totalPeriods);
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
            {data.totalPeriods === 0 ? (
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
                    You meet the 75% requirement. {attended} of {data.totalPeriods} periods count as attended.
                  </Notice>
                ) : (
                  <Notice tone="error">
                    <strong>You are below 75%.</strong> Attend the next <strong>{need} periods in a row</strong> to get back
                    above the line. If you missed lectures for a valid reason, apply for leave with proof.
                  </Notice>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Periods held" value={data.totalPeriods} />
            <StatCard label="Periods present" value={data.presentCount} tone="good" />
            <StatCard label="Periods absent" value={data.absentCount} tone={data.absentCount ? 'bad' : 'neutral'} onClick={() => { setHistoryStatus('ABSENT'); setActiveTab('student-history'); }} />
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
                    {c.attended} of {c.total} periods attended
                    {c.isDefaulter && (
                      <span className="text-rose-600 font-semibold"> · needs {neededFor75(c.attended, c.total)} periods in a row</span>
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
              <SelectField
                ariaLabel="Course"
                value={historyCourse}
                onChange={setHistoryCourse}
                minWidth={220}
                options={[{ value: 'ALL', label: 'All courses' }, ...data.courses.map((c) => ({ value: c.code, label: `${c.code} · ${c.title}` }))]}
              />
              <SelectField<AttendanceStatus | 'ALL'>
                ariaLabel="Status"
                value={historyStatus}
                onChange={setHistoryStatus}
                minWidth={180}
                options={[{ value: 'ALL', label: 'All statuses' }, ...ATTENDANCE_ORDER.map((k) => ({ value: k, label: ATTENDANCE_STATUS[k].label }))]}
              />
            </div>
            {history.length === 0 ? (
              <EmptyState icon={History} title="Nothing to show" description="No lectures match these filters." />
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Course</TableCell>
                      <TableCell>Lecture</TableCell>
                      <TableCell align="center">Periods</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.sessionId} className={h.status === 'ABSENT' ? 'bg-rose-50/40' : ''}>
                        <TableCell className="text-slate-600 whitespace-nowrap">{formatDate(h.lectureDate)}</TableCell>
                        <TableCell className="text-slate-600 whitespace-nowrap">{h.courseCode}{h.isLab && ' · Lab'}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{lectureName(h)}</TableCell>
                        <TableCell align="center" className="text-slate-600">{h.periods}</TableCell>
                        <TableCell><StatusBadge status={h.status} /></TableCell>
                        <TableCell className="text-slate-500">{h.remarks || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
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
                          {l.documentUrl?.startsWith('/api/files/') && (
                            <a href={l.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
                              <Paperclip className="w-3.5 h-3.5" /> Proof
                            </a>
                          )}
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

      {activeTab === 'student-marks' && <StudentMarksTab />}
      {activeTab === 'student-assignments' && <StudentAssignmentsTab notify={setNotice} />}
      {activeTab === 'student-schedule' && <ScheduleTab description="Your exams, holidays and college events." />}

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
            <Button variant="primary" icon={Send} type="submit" form="leave-form" loading={submitting} disabled={!!dateError || !reason.trim() || uploading}>
              Send to HOD
            </Button>
          </>
        }
      >
        <form id="leave-form" onSubmit={submitLeave} className="flex flex-col gap-4 pt-1">
          <SelectField<LeaveType>
            id="leave-type"
            label="Type"
            value={leaveType}
            onChange={setLeaveType}
            helperText={LEAVE_TYPES[leaveType].hint}
            options={(Object.keys(LEAVE_TYPES) as LeaveType[]).map((k) => ({ value: k, label: LEAVE_TYPES[k].label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateInput id="leave-from" label="From" required value={startDate} onChange={setStartDate} />
            <DateInput id="leave-to" label="To" required value={endDate} onChange={setEndDate} error={!!dateError} min={startDate || undefined} />
          </div>
          {dateError && <p className="text-xs text-rose-600 -mt-2">{dateError}</p>}
          <TextField
            id="leave-reason"
            label="Reason"
            required
            multiline
            minRows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What happened, briefly"
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <div>
            <MuiButton
              component="label"
              variant="outlined"
              color="inherit"
              loading={uploading}
              loadingPosition="start"
              startIcon={<Paperclip size={16} />}
              sx={{ borderColor: 'divider' }}
            >
              {proof ? 'Change proof' : 'Attach proof (optional)'}
              <input
                id="leave-file"
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  setUploadError(null);
                  setUploading(true);
                  try {
                    const form = new FormData();
                    form.append('file', file);
                    form.append('purpose', 'LEAVE_PROOF');
                    const res = await fetch('/api/files', { method: 'POST', body: form });
                    const data = await res.json();
                    if (res.ok) setProof({ id: data.file.id, name: data.file.filename });
                    else setUploadError(data.error || 'Upload failed.');
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </MuiButton>
            <p className={`mt-1.5 text-2xs ${uploadError ? 'text-rose-600' : 'text-slate-500'}`}>
              {uploadError ??
                (proof ? (
                  <>
                    <strong className="text-slate-700">{proof.name}</strong> uploaded · only you and your HOD can see it
                  </>
                ) : (
                  'PDF, PNG or JPG, up to 4 MB.'
                ))}
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
