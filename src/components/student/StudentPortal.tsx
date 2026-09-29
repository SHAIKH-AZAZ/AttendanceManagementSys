'use client';

import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { AcademicMeta, LeaveApplication, StudentSummary, User } from '@/types';
import {
  api,
  dayCount,
  formatDate,
  formatPercent,
  humanize,
  LEAVE_STATUS_TONE,
  LEAVE_TYPES,
  plural,
  THRESHOLD,
  todayISO,
  useApi,
} from '@/lib/client';
import {
  AttendanceValue,
  Badge,
  Button,
  EmptyState,
  Field,
  FormDialog,
  LoadState,
  Meter,
  Notice,
  PageHeader,
  Panel,
  Person,
  Table,
  cn,
  control,
  td,
  textareaClass,
  th,
  useToast,
} from '@/components/ui';

export function StudentPortal({ user, meta, view }: { user: User; meta: AcademicMeta; view: string }) {
  const notify = useToast();
  const q = useApi<{ summary: StudentSummary; leaves: LeaveApplication[] }>(
    `/api/student/summary?studentId=${encodeURIComponent(user.id)}`
  );
  const [applying, setApplying] = useState(false);

  const department = meta.departments.find((d) => d.id === user.departmentId);
  const campus = meta.campuses.find((c) => c.id === user.campusId);
  const enrollment = user.studentProfile?.enrollmentNumber;

  async function apply(data: FormData) {
    const startDate = String(data.get('startDate'));
    const endDate = String(data.get('endDate'));
    if (endDate < startDate) throw new Error('The last day must be on or after the first day.');
    await api.post('/api/leaves', {
      studentId: user.id,
      studentName: user.fullName,
      enrollmentNumber: enrollment,
      campusId: user.campusId,
      departmentId: user.departmentId,
      leaveType: data.get('leaveType'),
      startDate,
      endDate,
      reason: String(data.get('reason')).trim(),
    });
    q.reload();
    notify('Leave application submitted for review.');
  }

  const applyButton = (
    <Button onClick={() => setApplying(true)}>
      <CalendarPlus aria-hidden /> Apply for leave
    </Button>
  );

  const applyDialog = applying && (
    <FormDialog
      title="Apply for leave"
      description="Your head of department reviews each application."
      submitLabel="Submit application"
      onClose={() => setApplying(false)}
      onSubmit={apply}
    >
      <Field label="Leave type">
        <select name="leaveType" required defaultValue="MEDICAL" className={control}>
          {Object.entries(LEAVE_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First day">
          <input type="date" name="startDate" required defaultValue={todayISO()} className={control} />
        </Field>
        <Field label="Last day">
          <input type="date" name="endDate" required defaultValue={todayISO()} className={control} />
        </Field>
      </div>
      <Field
        label="Reason"
        hint="Keep supporting documents, such as a medical certificate, ready in case the department asks for them."
      >
        <textarea name="reason" required minLength={10} maxLength={500} rows={4} className={textareaClass} />
      </Field>
    </FormDialog>
  );

  if (view === 'leave') {
    const leaves = q.data?.leaves ?? [];
    return (
      <>
        <PageHeader
          title="Leave applications"
          description="Approved leave is applied to your attendance automatically for every lecture it covers."
          actions={applyButton}
        />
        <Panel>
          {!q.data ? (
            <LoadState error={q.error} onRetry={q.reload} />
          ) : leaves.length === 0 ? (
            <EmptyState
              title="No leave applications"
              description="Apply before an expected absence, or as soon as possible after an unexpected one."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Type</th>
                  <th className={th}>Dates</th>
                  <th className={th}>Reason</th>
                  <th className={th}>Submitted</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reviewer’s comment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className={cn(td, 'font-medium whitespace-nowrap text-slate-900')}>{LEAVE_TYPES[leave.leaveType]}</td>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      <div className="tabular-nums">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </div>
                      <div className="text-xs text-slate-500">{plural(dayCount(leave.startDate, leave.endDate), 'day')}</div>
                    </td>
                    <td className={cn(td, 'max-w-md min-w-64 text-slate-700')}>{leave.reason}</td>
                    <td className={cn(td, 'whitespace-nowrap text-slate-600 tabular-nums')}>{formatDate(leave.createdAt)}</td>
                    <td className={td}>
                      <Badge tone={LEAVE_STATUS_TONE[leave.status]}>{humanize(leave.status)}</Badge>
                    </td>
                    <td className={cn(td, 'min-w-52 text-slate-600')}>
                      {leave.reviewComments ?? <span className="text-slate-400">Awaiting review</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>
        {applyDialog}
      </>
    );
  }

  const summary = q.data?.summary;
  const behind = summary?.courses.filter((c) => c.isDefaulter) ?? [];

  return (
    <>
      <PageHeader
        title="My attendance"
        description={[enrollment, department?.name, campus?.name].filter(Boolean).join(', ')}
        actions={applyButton}
      />

      {!summary ? (
        <Panel>
          <LoadState error={q.error} onRetry={q.reload} />
        </Panel>
      ) : summary.totalSessions === 0 ? (
        <Panel>
          <EmptyState
            title="No attendance recorded yet"
            description="Your figures appear after faculty submit the first lecture session."
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {behind.length > 0 && (
            <Notice tone="warning" title={`Below ${THRESHOLD}% in ${behind.map((c) => c.code).join(', ')}`}>
              Students below {THRESHOLD}% in a course can be barred from its final examination. Attend the upcoming
              lectures, and apply for leave for absences that qualify.
            </Notice>
          )}

          <section className="grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="bg-white px-6 py-5">
              <h2 className="text-sm text-slate-600">Overall attendance</h2>
              <p
                className={cn(
                  'mt-1 font-serif text-5xl font-semibold tracking-tight tabular-nums',
                  summary.isCompliant ? 'text-slate-900' : 'text-red-700'
                )}
              >
                {formatPercent(summary.overallPercentage)}
              </p>
              <Meter value={summary.overallPercentage} className="mt-6 h-2" />
              <div className="relative mt-2 h-4 text-xs text-slate-600">
                <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${THRESHOLD}%` }}>
                  {THRESHOLD}% minimum
                </span>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3">
              {[
                { label: 'Lectures held', value: summary.totalSessions },
                { label: 'Attended', value: summary.totalSessions - summary.absentCount },
                { label: 'Absent', value: summary.absentCount },
                { label: 'Present', value: summary.presentCount },
                { label: 'Late', value: summary.lateCount, detail: 'Counts as attended' },
                { label: 'Authorized absence', value: summary.excusedCount, detail: 'Excused, medical or on duty' },
              ].map((item) => (
                <div key={item.label} className="bg-white px-5 py-4">
                  <dt className="text-sm text-slate-600">{item.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{item.value}</dd>
                  {item.detail && <dd className="mt-0.5 text-xs text-slate-500">{item.detail}</dd>}
                </div>
              ))}
            </dl>
          </section>

          <Panel title="Courses" description={`Eligibility is assessed separately for each course.`}>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Course</th>
                  <th className={cn(th, 'text-right')}>Attended</th>
                  <th className={th}>Attendance</th>
                  <th className={th}>Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.courses.map((c) => (
                  <tr key={c.courseId}>
                    <td className={cn(td, 'min-w-52')}>
                      <Person name={c.title} detail={c.code} />
                    </td>
                    <td className={cn(td, 'text-right whitespace-nowrap tabular-nums')}>
                      {c.attended} of {c.total}
                    </td>
                    <td className={td}>
                      <AttendanceValue value={c.percentage} />
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      {c.isDefaulter ? (
                        <span className="flex items-center gap-2">
                          <Badge tone="danger">Below {THRESHOLD}%</Badge>
                          <span className="text-slate-600">Attend the next {plural(c.neededFor75, 'lecture')}</span>
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
        </div>
      )}
      {applyDialog}
    </>
  );
}
