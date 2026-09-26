'use client';

import React, { useState, useEffect } from 'react';
import { LeaveApplication } from '@/types';
import {
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  Upload,
  Send,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface StudentPortalProps {
  activeTab: string;
}

interface StudentSummaryData {
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
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ activeTab }) => {
  const [data, setData] = useState<StudentSummaryData | null>(null);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Leave Form state
  const [leaveType, setLeaveType] = useState<'CASUAL' | 'MEDICAL' | 'ON_DUTY' | 'BEREAVEMENT'>('MEDICAL');
  const [startDate, setStartDate] = useState('2026-09-28');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [reason, setReason] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStudentData = async () => {
    try {
      const res = await fetch('/api/student/summary?studentId=stu-4');
      const json = await res.json();
      if (json.summary) setData(json.summary);
      if (json.leaves) setLeaves(json.leaves);
    } catch (err) {
      console.error('Error fetching student summary:', err);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'stu-4',
          studentName: 'Devendra Joshi',
          enrollmentNumber: 'CS-2026-004',
          campusId: 'campus-1',
          departmentId: 'dept-cs',
          leaveType,
          startDate,
          endDate,
          reason,
          documentUrl: fileName ? `/uploads/${fileName}` : '/uploads/medical_cert_devendra.pdf',
        }),
      });

      if (res.ok) {
        setIsApplyModalOpen(false);
        setReason('');
        setNotification({
          type: 'success',
          message: 'Leave application submitted successfully. Forwarded to HOD for approval.',
        });
        fetchStudentData();
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to submit leave.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20 ring-1 ring-black/5">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Devendra Joshi</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-mono">
                  CS-2026-004
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                B.Tech Computer Science & Engineering • Trimester 2 • North Campus
              </p>
            </div>
          </div>

          {/* Quick Leave Apply Trigger */}
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Calendar className="w-4 h-4" />
            + Apply for Leave
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Main View: Attendance Statistics */}
      {activeTab === 'student-overview' && (
        <div className="space-y-6">
          {/* Key Overall Gauge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Overall Attendance Percentage Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Overall Attendance</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Min Required: 75%
                  </span>
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span
                    className={`text-4xl font-extrabold ${
                      (data?.overallPercentage || 0) < 75 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {data?.overallPercentage || 0}%
                  </span>
                  {(data?.overallPercentage || 0) < 75 ? (
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Defaulter Alert
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (data?.overallPercentage || 0) < 75
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, data?.overallPercentage || 0)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                  <span>0%</span>
                  <span className="text-amber-700 font-bold">75% Threshold</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Attendance Breakdown Counters */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs md:col-span-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Lecture Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Total Lectures</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {data?.totalSessions || 0}
                  </div>
                </div>
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-800 font-medium">Present (P)</div>
                  <div className="text-xl font-bold text-emerald-700 mt-1">
                    {data?.presentCount || 0}
                  </div>
                </div>
                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200">
                  <div className="text-xs text-rose-800 font-medium">Absent (A)</div>
                  <div className="text-xl font-bold text-rose-700 mt-1">
                    {data?.absentCount || 0}
                  </div>
                </div>
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <div className="text-xs text-blue-800 font-medium">Excused / Medical</div>
                  <div className="text-xl font-bold text-blue-700 mt-1">
                    {data?.excusedCount || 0}
                  </div>
                </div>
              </div>

              {(data?.overallPercentage || 0) < 75 && (
                <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>Academic Compliance Notice:</strong> Your current attendance is below the
                    mandatory 75% university regulation. You must attend upcoming lectures consistently
                    or submit valid medical/on-duty proof to avoid detention from final examinations.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Course-Wise Breakdown Cards */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Enrolled Courses Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.courses.map((c) => {
                const needed = c.isDefaulter
                  ? Math.max(1, Math.ceil((0.75 * c.total - c.attended) / 0.25))
                  : 0;

                return (
                  <div
                    key={c.courseId}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                      c.isDefaulter ? 'border-rose-200 bg-rose-50/15' : 'border-slate-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {c.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1.5">{c.title}</h4>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-lg font-extrabold ${
                            c.isDefaulter ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {c.percentage}%
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {c.attended} / {c.total} attended
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full ${
                            c.isDefaulter ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, c.percentage)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                      {c.isDefaulter ? (
                        <span className="text-rose-700 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" /> Requires {needed} consecutive
                          presences
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Good Standing (&ge; 75%)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Apply & Track Leave */}
      {activeTab === 'student-leaves' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leave Applications & Approval Status</h3>
              <p className="text-xs text-slate-500">
                Approved leaves are automatically converted to Excused attendance
              </p>
            </div>
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              + New Leave Application
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">HOD Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">{l.leaveType}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {l.startDate} &rarr; {l.endDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{l.reason}</td>
                    <td className="py-3 px-4">
                      {l.documentUrl ? (
                        <span className="text-indigo-600 font-semibold text-xs flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Attached
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : l.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {l.reviewComments || 'Pending review by HOD'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Application Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Apply for Academic Leave
              </h3>
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MEDICAL">Medical Leave (Doctor Certificate Required)</option>
                  <option value="ON_DUTY">On Duty (Event / Competition Representation)</option>
                  <option value="CASUAL">Casual Leave (Personal Emergency)</option>
                  <option value="BEREAVEMENT">Bereavement Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Detailed Reason</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the reason for absence..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Upload Supporting Proof (PDF / Image)
                </label>
                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <Upload className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                  <span className="text-slate-600 font-medium">
                    {fileName ? (
                      <span className="text-emerald-700 font-bold">{fileName}</span>
                    ) : (
                      'Click to attach Medical Certificate / OD letter'
                    )}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    id="leave-file-input"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFileName(e.target.files[0].name);
                    }}
                  />
                  <label
                    htmlFor="leave-file-input"
                    className="block mt-2 text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer font-bold"
                  >
                    Browse Local File
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Submit to HOD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
