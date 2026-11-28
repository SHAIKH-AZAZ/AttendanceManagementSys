'use client';

import TextField from '@mui/material/TextField';
import MuiButton from '@mui/material/Button';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StudentMarksTab } from './MarksTab';
import { StudentAssignmentsTab } from './AssignmentsTab';
import { StudentFeesTab } from './FeesTab';
import { LectureHistory, type HistoryFilter } from './LectureHistory';
import { StudentOverview } from './StudentOverview';
import { ScheduleTab } from '@/components/schedule/ScheduleTab';
import type { PortalProps } from '@/lib/navigation';
import type { AttendanceStatus, LeaveApplication, LeaveType } from '@/types';
import {
  Button,
  Card,
  EmptyState,
  LEAVE_TYPES,
  LeaveStatusBadge,
  Modal,
  Notice,
  useTabNotice,
  PageHeader,
  formatDate,
  SelectField,
  DateInput,
} from '@/components/ui';
import { CalendarPlus, FileText, Paperclip, Send } from 'lucide-react';

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
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('ALL');

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

  if (!data) {
    return <Card><p className="text-sm text-slate-500">Loading your attendance…</p></Card>;
  }

  const attended = data.presentCount + data.lateCount + data.excusedCount;
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

          <StudentOverview
            totalPeriods={data.totalPeriods}
            attended={attended}
            presentCount={data.presentCount}
            absentCount={data.absentCount}
            percentage={data.overallPercentage}
            isCompliant={data.isCompliant}
            courses={data.courses}
            history={data.history}
            pendingLeaves={pending}
            onApply={openApply}
            onViewMissed={() => { setHistoryFilter('MISSED'); setActiveTab('student-history'); }}
            onViewLeaves={() => setActiveTab('student-leaves')}
          />
        </>
      )}

      {/* ------------------------------------------------------ Lecture history */}
      {activeTab === 'student-history' && (
        <>
          <PageHeader title="Lecture history" description="Every submitted lecture and how you were marked." />
          <LectureHistory
            history={data.history}
            courses={data.courses}
            overallPercentage={data.overallPercentage}
            overallAttended={attended}
            overallTotal={data.totalPeriods}
            course={historyCourse}
            onCourse={setHistoryCourse}
            filter={historyFilter}
            onFilter={setHistoryFilter}
          />
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
      {activeTab === 'student-fees' && <StudentFeesTab notify={setNotice} />}
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
