'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMeta, type MetaSection } from '@/hooks/useMeta';
import type { PortalProps } from '@/lib/navigation';
import type { LeaveApplication, LectureSession, StudentComplianceStats } from '@/types';
import {
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
  SegmentedControl,
  StatCard,
  formatDate,
  inputClass,
  selectClass,
} from '@/components/ui';
import { AlertTriangle, Award, BookOpen, Check, CheckCircle2, FileClock, Inbox, Lock, Mail, Paperclip, X } from 'lucide-react';

type LeaveFilter = 'PENDING' | 'APPROVED' | 'REJECTED';

export const HODPortal: React.FC<PortalProps> = ({ activeTab, setActiveTab, onOpenUniversityReport }) => {
  const { user } = useAuth();
  const { meta, course, classLabel } = useMeta();

  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [compliance, setCompliance] = useState<Record<string, StudentComplianceStats[]>>({});
  const { notice, setNotice } = useTabNotice(activeTab);

  const [leaveFilter, setLeaveFilter] = useState<LeaveFilter>('PENDING');
  const [review, setReview] = useState<{ leave: LeaveApplication; decision: 'APPROVED' | 'REJECTED' } | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const [classId, setClassId] = useState('');
  const [onlyBelow, setOnlyBelow] = useState(true);

  const deptSections = useMemo<MetaSection[]>(
    () => (meta?.sections ?? []).filter((s) => s.departmentId === user?.departmentId),
    [meta, user?.departmentId]
  );
  const department = meta?.departments.find((d) => d.id === user?.departmentId);

  useEffect(() => {
    if (!classId && deptSections[0]) setClassId(deptSections[0].id);
  }, [deptSections, classId]);

  const loadLeaves = useCallback(async () => {
    const res = await fetch('/api/leaves');
    if (res.ok) setLeaves((await res.json()).leaves ?? []);
  }, []);

  useEffect(() => {
    loadLeaves();
    fetch('/api/sessions')
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((j) => setSessions(j.sessions ?? []));
  }, [loadLeaves]);

  useEffect(() => {
    if (!deptSections.length) return;
    Promise.all(
      deptSections.map(async (s) => {
        const res = await fetch(`/api/compliance/defaulters?courseId=${s.courseId}&sectionId=${s.id}`);
        return [s.id, res.ok ? (await res.json()).stats ?? [] : []] as const;
      })
    ).then((entries) => setCompliance(Object.fromEntries(entries)));
  }, [deptSections]);

  const classStats = (s: MetaSection) => {
    const list = sessions.filter((x) => x.sectionId === s.id);
    const lockedList = list.filter((x) => x.isLocked);
    const avg = lockedList.length
      ? Math.round(
          lockedList.reduce((sum, x) => sum + (x.summary.totalStudents ? x.summary.presentCount / x.summary.totalStudents : 0), 0) /
            lockedList.length *
            100
        )
      : null;
    return {
      locked: lockedList.length,
      drafts: list.length - lockedList.length,
      avg,
      below: (compliance[s.id] ?? []).filter((x) => x.isDefaulter).length,
    };
  };

  const openReview = (leave: LeaveApplication, decision: 'APPROVED' | 'REJECTED') => {
    setComment('');
    setReview({ leave, decision });
  };

  const submitReview = async () => {
    if (!review) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/leaves/${review.leave.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: review.decision, reviewComments: comment.trim() || undefined }),
      });
      const data = await res.json();
      setReview(null);
      if (res.ok) {
        setNotice({
          tone: 'success',
          text:
            review.decision === 'APPROVED'
              ? `Approved. ${review.leave.studentName}'s absences in that period are now excused (${data.updatedSessionCount ?? 0} ${data.updatedSessionCount === 1 ? 'lecture' : 'lectures'}).`
              : `Rejected. ${review.leave.studentName} will see your comment.`,
        });
        loadLeaves();
      } else setNotice({ tone: 'error', text: data.error || 'Could not save the decision.' });
    } finally {
      setBusy(false);
    }
  };

  const sendWarning = async (stu: StudentComplianceStats) => {
    const res = await fetch('/api/compliance/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: stu.studentId,
        studentName: stu.fullName,
        enrollmentNumber: stu.enrollmentNumber,
        courseCode: stu.courseCode,
        percentage: stu.percentage,
      }),
    });
    setNotice(
      res.ok
        ? { tone: 'success', text: `Warning recorded for ${stu.fullName} in the audit log. Email delivery isn't connected yet.` }
        : { tone: 'error', text: 'Could not record the warning.' }
    );
  };

  if (!meta) return <Card><p className="text-sm text-slate-500">Loading department…</p></Card>;

  const pending = leaves.filter((l) => l.status === 'PENDING');
  const belowTotal = deptSections.reduce((n, s) => n + classStats(s).below, 0);
  const draftTotal = deptSections.reduce((n, s) => n + classStats(s).drafts, 0);

  return (
    <div>
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
          {notice.text}
        </Notice>
      )}

      {/* ------------------------------------------------------------ Overview */}
      {activeTab === 'hod-overview' && (
        <>
          <PageHeader title={department?.name ?? 'Department'} description={`Head of department: ${user?.fullName}`} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Classes" value={deptSections.length} icon={BookOpen} />
            <StatCard
              label="Lectures locked"
              value={sessions.filter((s) => s.isLocked && deptSections.some((d) => d.id === s.sectionId)).length}
              icon={Lock}
            />
            <StatCard
              label="Leave to review"
              value={pending.length}
              icon={Inbox}
              tone={pending.length ? 'warn' : 'neutral'}
              hint={pending.length ? 'Waiting for your decision' : 'Nothing pending'}
              onClick={() => {
                setLeaveFilter('PENDING');
                setActiveTab('hod-leaves');
              }}
            />
            <StatCard
              label="Below 75%"
              value={belowTotal}
              icon={AlertTriangle}
              tone={belowTotal ? 'bad' : 'good'}
              hint="Across all classes"
              onClick={() => setActiveTab('hod-defaulters')}
            />
          </div>

          {(pending.length > 0 || draftTotal > 0) && (
            <Card className="mt-5">
              <h2 className="text-base font-semibold text-slate-800">Needs attention</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {pending.length > 0 && (
                  <li className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">
                      <strong>{pending.length}</strong> leave {pending.length === 1 ? 'request is' : 'requests are'} waiting for a decision.
                    </span>
                    <Button size="sm" variant="primary" onClick={() => { setLeaveFilter('PENDING'); setActiveTab('hod-leaves'); }}>
                      Review
                    </Button>
                  </li>
                )}
                {draftTotal > 0 && (
                  <li className="py-3 text-sm text-slate-700">
                    <strong>{draftTotal}</strong> lecture {draftTotal === 1 ? 'draft has' : 'drafts have'} not been submitted by faculty yet, so
                    they don&apos;t count towards attendance.
                  </li>
                )}
              </ul>
            </Card>
          )}

          <h2 className="mt-8 mb-3 text-base font-semibold text-slate-800">Classes</h2>
          <Card padded={false}>
            {deptSections.length === 0 ? (
              <EmptyState icon={BookOpen} title="No classes in this department" />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Class</th>
                      <th className="py-2.5 px-3 font-semibold">Faculty</th>
                      <th className="py-2.5 px-3 font-semibold">Lectures</th>
                      <th className="py-2.5 px-3 font-semibold">Average present</th>
                      <th className="py-2.5 px-3 font-semibold">Below 75%</th>
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deptSections.map((s) => {
                      const st = classStats(s);
                      return (
                        <tr key={s.id}>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{course(s.courseId)?.title}</div>
                            <div className="text-xs text-slate-500">{classLabel(s.id)} · {s.studentCount} students</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{s.facultyName}</td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                            {st.locked} locked{st.drafts > 0 && <Badge tone="warn" className="ml-2">{st.drafts} draft</Badge>}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{st.avg === null ? '—' : `${st.avg}%`}</td>
                          <td className={`py-3 px-3 font-semibold ${st.below ? 'text-rose-600' : 'text-slate-500'}`}>{st.below}</td>
                          <td className="py-3 px-4 text-right">
                            <Button size="sm" variant="ghost" icon={Award} disabled={!st.locked} onClick={() => onOpenUniversityReport(s.courseId, s.id)}>
                              Report
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ------------------------------------------------------ Leave approvals */}
      {activeTab === 'hod-leaves' && (
        <>
          <PageHeader
            title="Leave approvals"
            description="Approving a request excuses the student's absences in that period."
            actions={
              <SegmentedControl
                label="Leave status"
                value={leaveFilter}
                onChange={setLeaveFilter}
                options={(['PENDING', 'APPROVED', 'REJECTED'] as const).map((v) => ({
                  value: v,
                  label: v === 'PENDING' ? 'Pending' : v === 'APPROVED' ? 'Approved' : 'Rejected',
                  count: leaves.filter((l) => l.status === v).length,
                }))}
              />
            }
          />
          {(() => {
            const list = leaves.filter((l) => l.status === leaveFilter).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            if (!list.length)
              return (
                <Card>
                  <EmptyState
                    icon={leaveFilter === 'PENDING' ? CheckCircle2 : Inbox}
                    title={leaveFilter === 'PENDING' ? 'All caught up' : 'Nothing here'}
                    description={leaveFilter === 'PENDING' ? 'There are no leave requests waiting for you.' : undefined}
                  />
                </Card>
              );
            return (
              <div className="space-y-3">
                {list.map((l) => (
                  <Card key={l.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{l.studentName}</h3>
                          <span className="font-mono text-xs text-slate-500">{l.enrollmentNumber}</span>
                          <LeaveStatusBadge status={l.status} />
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {LEAVE_TYPES[l.leaveType].label} · {formatDate(l.startDate)}
                          {l.endDate !== l.startDate && <> to {formatDate(l.endDate)}</>} · applied {formatDate(l.createdAt)}
                        </p>
                      </div>
                      {l.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <Button variant="danger" size="sm" icon={X} onClick={() => openReview(l, 'REJECTED')}>
                            Reject
                          </Button>
                          <Button variant="primary" size="sm" icon={Check} onClick={() => openReview(l, 'APPROVED')}>
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{l.reason}</p>
                    {l.documentUrl && <Badge icon={Paperclip} className="mt-3">Proof attached</Badge>}
                    {l.status !== 'PENDING' && l.reviewComments && (
                      <p className="mt-3 text-sm text-slate-500">
                        <span className="font-semibold text-slate-700">Your comment: </span>
                        {l.reviewComments}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            );
          })()}
        </>
      )}

      {/* ----------------------------------------------------------- Defaulters */}
      {activeTab === 'hod-defaulters' && (
        <>
          <PageHeader
            title="Defaulters"
            description="Students under 75% in locked lectures. Send a warning before exams so they can recover."
            actions={
              <select aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
                {deptSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {classLabel(s.id)}
                  </option>
                ))}
              </select>
            }
          />
          {(() => {
            const stats = compliance[classId] ?? [];
            if (!stats.length)
              return (
                <Card>
                  <EmptyState icon={FileClock} title="No locked lectures yet" description="Percentages appear once faculty submit lectures for this class." />
                </Card>
              );
            const rows = onlyBelow ? stats.filter((s) => s.isDefaulter) : stats;
            return (
              <Card padded={false}>
                <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    <strong className="text-rose-600">{stats.filter((s) => s.isDefaulter).length}</strong> of {stats.length} students below 75%
                  </span>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                    Only below 75%
                  </label>
                </div>
                {rows.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Everyone is above 75%" />
                ) : (
                  <div className="table-scroll">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Student</th>
                          <th className="py-2.5 px-3 font-semibold w-56">Attendance</th>
                          <th className="py-2.5 px-3 font-semibold">To reach 75%</th>
                          <th className="py-2.5 px-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((s) => (
                          <tr key={s.studentId}>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{s.fullName}</div>
                              <div className="font-mono text-xs text-slate-500">{s.enrollmentNumber}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                <span className={`w-12 font-bold ${s.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}`}>{s.percentage}%</span>
                                <div className="flex-1"><ProgressBar value={s.percentage} /></div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{s.attendedLectures} of {s.totalLectures}</div>
                            </td>
                            <td className="py-3 px-3 text-slate-600">{s.isDefaulter ? `${s.neededFor75} in a row` : 'On track'}</td>
                            <td className="py-3 px-4 text-right">
                              {s.isDefaulter && (
                                <Button size="sm" icon={Mail} onClick={() => sendWarning(s)}>
                                  Send warning
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })()}
        </>
      )}

      {/* -------------------------------------------------------------- Reports */}
      {activeTab === 'hod-reports' && (
        <>
          <PageHeader title="Reports" description="Examination-board eligibility reports, one per class. Only locked lectures are counted." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptSections.map((s) => {
              const st = classStats(s);
              return (
                <Card key={s.id} className="flex flex-col">
                  <Badge tone="accent" className="self-start">{course(s.courseId)?.code}</Badge>
                  <h3 className="mt-2 font-semibold text-slate-800">{course(s.courseId)?.title}</h3>
                  <p className="text-sm text-slate-500">{s.name} · {s.facultyName}</p>
                  <p className="mt-3 text-xs text-slate-500">{st.locked} locked lectures · {s.studentCount} students</p>
                  <Button className="mt-4" icon={Award} disabled={!st.locked} onClick={() => onOpenUniversityReport(s.courseId, s.id)}>
                    {st.locked ? 'Open report' : 'No lectures yet'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Review decision */}
      <Modal
        open={review !== null}
        onClose={() => setReview(null)}
        icon={review?.decision === 'APPROVED' ? Check : X}
        title={review?.decision === 'APPROVED' ? 'Approve leave' : 'Reject leave'}
        description={
          review &&
          `${review.leave.studentName} · ${LEAVE_TYPES[review.leave.leaveType].label} · ${formatDate(review.leave.startDate)}${
            review.leave.endDate !== review.leave.startDate ? ` to ${formatDate(review.leave.endDate)}` : ''
          }`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setReview(null)}>
              Cancel
            </Button>
            <Button
              variant={review?.decision === 'APPROVED' ? 'primary' : 'danger'}
              loading={busy}
              disabled={review?.decision === 'REJECTED' && !comment.trim()}
              onClick={submitReview}
            >
              {review?.decision === 'APPROVED' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        {review?.decision === 'APPROVED' && (
          <Notice tone="info" className="mb-4">
            Absences between {review && formatDate(review.leave.startDate)} and {review && formatDate(review.leave.endDate)} will be marked excused.
          </Notice>
        )}
        <Field
          label={review?.decision === 'REJECTED' ? 'Reason for rejecting' : 'Comment (optional)'}
          htmlFor="review-comment"
          hint="The student sees this."
        >
          <textarea
            id="review-comment"
            rows={3}
            maxLength={300}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className={`${inputClass} h-auto py-2`}
          />
        </Field>
      </Modal>
    </div>
  );
};
