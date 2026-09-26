'use client';

import React, { useState, useEffect } from 'react';
import { LeaveApplication, StudentComplianceStats } from '@/types';
import {
  ShieldCheck,
  AlertTriangle,
  Mail,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';

interface HODPortalProps {
  activeTab: string;
  onOpenUniversityReport?: (courseId: string, sectionId: string) => void;
}

export const HODPortal: React.FC<HODPortalProps> = ({
  activeTab,
  onOpenUniversityReport,
}) => {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [defaulters, setDefaulters] = useState<StudentComplianceStats[]>([]);
  const [complianceRate, setComplianceRate] = useState<number>(80);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [hodComments, setHodComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const leavesRes = await fetch('/api/leaves?departmentId=dept-cs');
      const leavesJson = await leavesRes.json();
      if (leavesJson.leaves) setLeaves(leavesJson.leaves);

      const defRes = await fetch('/api/compliance/defaulters?courseId=course-ds&sectionId=sec-ds-a');
      const defJson = await defRes.json();
      if (defJson.defaulters) setDefaulters(defJson.defaulters);
      if (defJson.complianceRate !== undefined) setComplianceRate(defJson.complianceRate);
    } catch (err) {
      console.error('Error fetching HOD data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReviewLeave = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/leaves/${leaveId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hodUserId: 'user-hod-1',
          status,
          reviewComments: hodComments || `Leave application ${status.toLowerCase()} by HOD.`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || `Leave ${status.toLowerCase()} successfully.`,
        });
        setHodComments('');
        fetchData();
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to review leave.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error reviewing leave.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendWarningEmail = async (stu: StudentComplianceStats) => {
    try {
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
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'info',
          message: `Official 75% compliance warning email dispatched to ${stu.fullName} (${stu.enrollmentNumber}).`,
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to send alert email.' });
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Top HOD Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Department Scope</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-base font-bold text-slate-900">Computer Science & Engg</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">HOD: Dr. Sunita Rao</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Overall Compliance</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{complianceRate}%</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Students meeting 75% mark</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Defaulters List (&lt;75%)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{defaulters.length} Defaulters</div>
          <div className="text-xs text-rose-700/80 mt-1 font-medium">Requires immediate intervention</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Pending Leave Requests</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{pendingLeaves.length} Requests</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Awaiting approval</div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
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

      {/* Overview Tab: Department Health Barometer */}
      {activeTab === 'hod-overview' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Course Submission & Health Status</h3>
                <p className="text-xs text-slate-500">Computer Science Department • Trimester 2</p>
              </div>
              {onOpenUniversityReport && (
                <button
                  onClick={() => onOpenUniversityReport('course-ds', 'sec-ds-a')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Award className="w-3.5 h-3.5" /> Official University Submission
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  CS-301
                </span>
                <div className="text-sm font-bold text-slate-900 mt-2">Data Structures & Algo</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Faculty: Prof. Rajesh Sharma</div>
                <div className="mt-3 flex justify-between text-xs text-slate-700 font-medium">
                  <span>Attendance:</span>
                  <span className="font-bold text-emerald-700">82.4%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">24 of 25 lectures locked</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  CS-302
                </span>
                <div className="text-sm font-bold text-slate-900 mt-2">Database Management Systems</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Faculty: Dr. Anita Desai</div>
                <div className="mt-3 flex justify-between text-xs text-slate-700 font-medium">
                  <span>Attendance:</span>
                  <span className="font-bold text-emerald-700">79.1%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">20 of 20 lectures locked</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  CS-303
                </span>
                <div className="text-sm font-bold text-slate-900 mt-2">Operating Systems Architecture</div>
                <div className="text-xs text-slate-500 mt-0.5 font-medium">Faculty: Prof. K. R. Mehra</div>
                <div className="mt-3 flex justify-between text-xs text-slate-700 font-medium">
                  <span>Attendance:</span>
                  <span className="font-bold text-emerald-700">85.0%</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">18 of 18 lectures locked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Approvals Tab */}
      {activeTab === 'hod-leaves' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Student Leave Approvals & Automatic Attendance Excuse
              </h3>
              <p className="text-xs text-slate-500">
                Approving a leave automatically marks the student as Excused for overlapping lectures
                and logs to the audit trail.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              {pendingLeaves.length} Pending Actions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason & Document</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-center">HOD Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 text-slate-900 font-bold">{l.studentName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{l.enrollmentNumber}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-indigo-700 border border-slate-200">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {l.startDate} &rarr; {l.endDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      <div>{l.reason}</div>
                      {l.documentUrl && (
                        <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" /> Medical Certificate attached
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
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
                    <td className="py-3 px-4">
                      {l.status === 'PENDING' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id="btn-hod-approve-leave"
                            disabled={isProcessing}
                            onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs flex items-center gap-1 transition-all active:scale-95"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Excuse
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleReviewLeave(l.id, 'REJECTED')}
                            className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] block text-center font-medium">
                          Reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Defaulter Action Desk Tab */}
      {activeTab === 'hod-defaulters' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Defaulter Action Desk (&lt;75% Attendance Compliance)
              </h3>
              <p className="text-xs text-slate-500">
                Students below the minimum institutional threshold. HOD can dispatch warning notifications.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Attended / Total</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Recovery Requirement</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {defaulters.map((stu) => (
                  <tr key={stu.studentId} className="hover:bg-slate-50/80 bg-rose-50/20">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {stu.enrollmentNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-bold">{stu.fullName}</td>
                    <td className="py-3 px-4 text-indigo-700 font-semibold">{stu.courseCode}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {stu.attendedLectures} / {stu.totalLectures}
                    </td>
                    <td className="py-3 px-4 font-bold text-rose-600 text-sm">
                      {stu.percentage}%
                    </td>
                    <td className="py-3 px-4 text-amber-800 font-bold text-xs">
                      Must attend next {stu.neededFor75} lectures
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleSendWarningEmail(stu)}
                        className="px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1.5 mx-auto active:scale-95 transition-all"
                      >
                        <Mail className="w-3 h-3" /> Send Warning Email
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
