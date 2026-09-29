'use client';

import { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { AcademicMeta, ComplianceResponse, LeaveApplication, User } from '@/types';
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
  PageHeader,
  Panel,
  Person,
  Stats,
  Table,
  cn,
  control,
  td,
  textareaClass,
  th,
  useToast,
} from '@/components/ui';

interface HODPortalProps {
  user: User;
  meta: AcademicMeta;
  view: string;
  onOpenReport: (courseId: string, sectionId: string) => void;
}

export function HODPortal({ user, meta, view, onOpenReport }: HODPortalProps) {
  const notify = useToast();
  const department = meta.departments.find((d) => d.id === user.departmentId);
  const campus = meta.campuses.find((c) => c.id === department?.campusId);
  const sections = useMemo(
    () => meta.sections.filter((s) => s.departmentId === user.departmentId),
    [meta.sections, user.departmentId]
  );

  const complianceQ = useApi<ComplianceResponse[]>(
    sections.map((s) => `/api/compliance/defaulters?courseId=${s.courseId}&sectionId=${s.id}`)
  );
  const leavesQ = useApi<{ leaves: LeaveApplication[] }>(
    user.departmentId ? `/api/leaves?departmentId=${user.departmentId}` : null
  );

  const [leaveFilter, setLeaveFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [reviewing, setReviewing] = useState<LeaveApplication | null>(null);
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [warned, setWarned] = useState<ReadonlySet<string>>(new Set());
  const [warningKey, setWarningKey] = useState<string | null>(null);

  const leaves = leavesQ.data?.leaves ?? [];
  const pending = leaves.filter((l) => l.status === 'PENDING');
  const description = department && `${department.name}${campus ? `, ${campus.name}` : ''}`;
  const courseName = (courseId: string) => {
    const course = meta.courses.find((c) => c.id === courseId);
    return course ? `${course.code} ${course.title}` : courseId;
  };

  async function review(data: FormData) {
    if (!reviewing) return;
    const decision = String(data.get('action'));
    const comment = String(data.get('comment') ?? '').trim();
    if (decision === 'REJECTED' && !comment) {
      throw new Error('Add a comment that explains why the request is rejected.');
    }
    const result = await api.post<{ message: string }>(`/api/leaves/${reviewing.id}/review`, {
      hodUserId: user.id,
      status: decision,
      reviewComments: comment || undefined,
    });
    leavesQ.reload();
    complianceQ.reload();
    notify(result.message);
  }

  if (view === 'leave') {
    const shown = leaveFilter === 'PENDING' ? pending : leaves;
    return (
      <>
        <PageHeader
          title="Leave requests"
          description="Approving a request marks the student excused, on medical leave or on duty for every lecture in that period. Each decision is recorded in the audit log."
        />
        <Panel
          title="Requests"
          actions={
            <div role="group" aria-label="Filter requests" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
              {(
                [
                  ['PENDING', `Awaiting review (${pending.length})`],
                  ['ALL', `All (${leaves.length})`],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={leaveFilter === value}
                  onClick={() => setLeaveFilter(value)}
                  className={cn(
                    'h-7 rounded px-3 text-sm font-medium',
                    leaveFilter === value ? 'bg-brand-700 text-white' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {!leavesQ.data ? (
            <LoadState error={leavesQ.error} onRetry={leavesQ.reload} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={leaveFilter === 'PENDING' ? 'No requests awaiting review' : 'No leave requests yet'}
              description={leaveFilter === 'PENDING' ? 'New applications from students in your department appear here.' : undefined}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Type</th>
                  <th className={th}>Dates</th>
                  <th className={th}>Reason</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((leave) => (
                  <tr key={leave.id}>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      <Person name={leave.studentName} detail={leave.enrollmentNumber} />
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>{LEAVE_TYPES[leave.leaveType]}</td>
                    <td className={cn(td, 'whitespace-nowrap')}>
                      <div className="tabular-nums">
                        {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {plural(dayCount(leave.startDate, leave.endDate), 'day')}, submitted {formatDate(leave.createdAt)}
                      </div>
                    </td>
                    <td className={cn(td, 'max-w-sm min-w-60 text-slate-700')}>{leave.reason}</td>
                    <td className={td}>
                      <Badge tone={LEAVE_STATUS_TONE[leave.status]}>{humanize(leave.status)}</Badge>
                    </td>
                    <td className={cn(td, 'text-right whitespace-nowrap')}>
                      {leave.status === 'PENDING' ? (
                        <Button size="sm" onClick={() => setReviewing(leave)}>
                          Review
                        </Button>
                      ) : (
                        leave.reviewedAt && <span className="text-slate-500">Reviewed {formatDate(leave.reviewedAt)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        {reviewing && (
          <FormDialog
            title="Review leave request"
            description={`${reviewing.studentName}, ${reviewing.enrollmentNumber}`}
            actions={[
              { label: 'Reject', value: 'REJECTED', variant: 'secondary' },
              { label: 'Approve', value: 'APPROVED' },
            ]}
            onClose={() => setReviewing(null)}
            onSubmit={review}
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div>
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-900">{LEAVE_TYPES[reviewing.leaveType]}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Dates</dt>
                <dd className="font-medium text-slate-900">
                  {formatDate(reviewing.startDate)} to {formatDate(reviewing.endDate)}
                  <span className="font-normal text-slate-500">
                    {' '}
                    ({plural(dayCount(reviewing.startDate, reviewing.endDate), 'day')})
                  </span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Reason</dt>
                <dd className="text-slate-900">{reviewing.reason}</dd>
              </div>
              {reviewing.documentUrl && (
                <div className="col-span-2">
                  <dt className="text-slate-500">Supporting document</dt>
                  <dd className="text-slate-900">Provided with the application</dd>
                </div>
              )}
            </dl>
            <Field label="Comment" hint="Required when rejecting. The student sees this comment.">
              <textarea name="comment" rows={3} maxLength={500} className={textareaClass} />
            </Field>
          </FormDialog>
        )}
      </>
    );
  }

  if (view === 'defaulters') {
    const all = (complianceQ.data ?? []).flatMap((r) => r.defaulters).sort((a, b) => a.percentage - b.percentage);
    const courseIds = [...new Set(sections.map((s) => s.courseId))];
    const shown = courseFilter === 'ALL' ? all : all.filter((d) => d.courseId === courseFilter);

    const recordWarning = async (key: string, student: (typeof all)[number]) => {
      setWarningKey(key);
      try {
        await api.post('/api/compliance/alert', {
          studentId: student.studentId,
          studentName: student.fullName,
          enrollmentNumber: student.enrollmentNumber,
          courseCode: student.courseCode,
          percentage: student.percentage,
        });
        setWarned((prev) => new Set(prev).add(key));
        notify(`Warning recorded for ${student.fullName} in ${student.courseCode}.`);
      } catch (err) {
        notify((err as Error).message, 'error');
      } finally {
        setWarningKey(null);
      }
    };

    return (
      <>
        <PageHeader
          title="Defaulters"
          description={`Students below ${THRESHOLD}% attendance in a course, lowest first. Recorded warnings appear in the audit log.`}
        />
        <Panel
          title={complianceQ.data ? plural(shown.length, 'student') : 'Students'}
          actions={
            courseIds.length > 1 && (
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                aria-label="Filter by course"
                className={cn(control, 'w-auto')}
              >
                <option value="ALL">All courses</option>
                {courseIds.map((id) => (
                  <option key={id} value={id}>
                    {courseName(id)}
                  </option>
                ))}
              </select>
            )
          }
        >
          {!complianceQ.data ? (
            <LoadState error={complianceQ.error} onRetry={complianceQ.reload} />
          ) : shown.length === 0 ? (
            <EmptyState
              title={`No students below ${THRESHOLD}%`}
              description="Everyone with recorded attendance meets the requirement."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Student</th>
                  <th className={th}>Course</th>
                  <th className={cn(th, 'text-right')}>Attended</th>
                  <th className={th}>Attendance</th>
                  <th className={th}>To recover</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((student) => {
                  const key = `${student.courseId}:${student.studentId}`;
                  return (
                    <tr key={key}>
                      <td className={cn(td, 'whitespace-nowrap')}>
                        <Person name={student.fullName} detail={student.enrollmentNumber} />
                      </td>
                      <td className={cn(td, 'whitespace-nowrap')}>{student.courseCode}</td>
                      <td className={cn(td, 'text-right whitespace-nowrap tabular-nums')}>
                        {student.attendedLectures} of {student.totalLectures}
                      </td>
                      <td className={td}>
                        <AttendanceValue value={student.percentage} />
                      </td>
                      <td className={cn(td, 'whitespace-nowrap text-slate-600')}>
                        {plural(student.neededFor75, 'consecutive lecture')}
                      </td>
                      <td className={cn(td, 'text-right')}>
                        {warned.has(key) ? (
                          <span className="text-sm whitespace-nowrap text-slate-500">Warning recorded</span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={warningKey === key}
                            disabled={warningKey !== null}
                            onClick={() => recordWarning(key, student)}
                          >
                            Record warning
                          </Button>
                        )}
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

  // Default view: department overview.
  const all = complianceQ.data?.flatMap((r) => r.stats) ?? [];
  const tracked = new Set(all.map((s) => s.studentId));
  const below = new Set(all.filter((s) => s.isDefaulter).map((s) => s.studentId));
  const ready = !!complianceQ.data;

  return (
    <>
      <PageHeader title="Department overview" description={description || undefined} />
      <Stats
        items={[
          {
            label: 'Course sections',
            value: sections.length,
            detail: ready ? `${plural(tracked.size, 'student')} with recorded attendance` : undefined,
          },
          {
            label: `Meeting ${THRESHOLD}% in every course`,
            value: ready ? tracked.size - below.size : '–',
            detail:
              ready && tracked.size
                ? `${formatPercent(((tracked.size - below.size) / tracked.size) * 100)} of students`
                : undefined,
          },
          { label: `Below ${THRESHOLD}% in a course`, value: ready ? below.size : '–', alert: below.size > 0 },
          { label: 'Leave requests to review', value: leavesQ.data ? pending.length : '–' },
        ]}
      />
      <Panel className="mt-6" title="Course sections" description="Attendance from locked sessions this term.">
        {!complianceQ.data ? (
          <LoadState error={complianceQ.error} onRetry={complianceQ.reload} />
        ) : sections.length === 0 ? (
          <EmptyState title="No course sections in this department" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Course</th>
                <th className={th}>Faculty</th>
                <th className={cn(th, 'text-right')}>Students</th>
                <th className={cn(th, 'text-right')}>Locked sessions</th>
                <th className={th}>Average attendance</th>
                <th className={cn(th, 'text-right')}>Below {THRESHOLD}%</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sections.map((section, index) => {
                const stats = complianceQ.data?.[index]?.stats ?? [];
                const average = stats.length ? stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length : null;
                return (
                  <tr key={section.id}>
                    <td className={cn(td, 'min-w-60')}>
                      <Person name={courseName(section.courseId)} detail={section.name} />
                    </td>
                    <td className={cn(td, 'whitespace-nowrap')}>{section.facultyName}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>{section.studentCount}</td>
                    <td className={cn(td, 'text-right tabular-nums')}>
                      {Math.max(0, ...stats.map((s) => s.totalLectures))}
                    </td>
                    <td className={td}>
                      {average === null ? (
                        <span className="text-slate-400">No locked sessions</span>
                      ) : (
                        <AttendanceValue value={average} />
                      )}
                    </td>
                    <td className={cn(td, 'text-right tabular-nums')}>
                      {complianceQ.data?.[index]?.defaulterCount ?? 0}
                    </td>
                    <td className={cn(td, 'text-right')}>
                      <Button variant="ghost" size="sm" onClick={() => onOpenReport(section.courseId, section.id)}>
                        <FileText aria-hidden /> Report
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
