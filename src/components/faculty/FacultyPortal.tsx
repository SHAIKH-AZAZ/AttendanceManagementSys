'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LectureSession,
  AttendanceRecord,
  AttendanceStatus,
  StudentComplianceStats,
} from '@/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Copy,
  Lock,
  Search,
  Filter,
  Save,
  AlertTriangle,
  FileCheck,
  Check,
  Calendar,
  Users,
  Award,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface FacultyPortalProps {
  activeTab: string;
  onOpenUniversityReport?: (courseId: string, sectionId: string) => void;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({
  activeTab,
  onOpenUniversityReport,
}) => {
  const [sessions, setSessions] = useState<LectureSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('session-ds-today');
  const [currentSession, setCurrentSession] = useState<LectureSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [complianceStats, setComplianceStats] = useState<StudentComplianceStats[]>([]);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions?courseId=course-ds&sectionId=sec-ds-a');
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
        const active =
          data.sessions.find((s: LectureSession) => s.id === selectedSessionId) ||
          data.sessions[data.sessions.length - 1];
        if (active) {
          setCurrentSession(active);
          setRecords(JSON.parse(JSON.stringify(active.records)));
        }
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  // Fetch compliance
  const fetchCompliance = async () => {
    try {
      const res = await fetch('/api/compliance/defaulters?courseId=course-ds&sectionId=sec-ds-a');
      const data = await res.json();
      if (data.stats) {
        setComplianceStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching compliance:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchCompliance();
  }, [selectedSessionId]);

  const handleSelectSession = (s: LectureSession) => {
    setSelectedSessionId(s.id);
    setCurrentSession(s);
    setRecords(JSON.parse(JSON.stringify(s.records)));
    setNotification(null);
  };

  const summary = useMemo(() => {
    return {
      total: records.length,
      present: records.filter((r) => r.status === 'PRESENT').length,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      late: records.filter((r) => r.status === 'LATE').length,
      excused: records.filter((r) => r.status === 'EXCUSED').length,
      medical: records.filter((r) => r.status === 'MEDICAL_LEAVE').length,
      onDuty: records.filter((r) => r.status === 'ON_DUTY').length,
    };
  }, [records]);

  // Bulk Operations
  const handleMarkAll = (status: AttendanceStatus) => {
    if (currentSession?.isLocked) return;
    setRecords((prev) =>
      prev.map((r) => ({
        ...r,
        status,
        markedAt: new Date().toISOString(),
      }))
    );
    setNotification({
      type: 'info',
      message: `Marked all ${records.length} students as ${status}.`,
    });
  };

  // Copy Previous Session
  const handleCopyPrevious = async () => {
    if (currentSession?.isLocked) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}/copy-previous`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.records) {
        setRecords(data.records);
        setNotification({
          type: 'success',
          message: 'Copied student attendance from the preceding lecture session.',
        });
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to copy previous session.',
        });
      }
    } catch {
      setNotification({
        type: 'error',
        message: 'Network error copying previous session.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (currentSession?.isLocked) return;
    setRecords((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? { ...r, status, markedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (currentSession?.isLocked) return;
    setRecords((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  const handleSaveDraft = async () => {
    if (currentSession?.isLocked) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'Draft attendance saved successfully.',
        });
        fetchSessions();
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to save draft.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSubmitAndLock = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId: 'user-faculty-1',
          records,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsLockModalOpen(false);
        setNotification({
          type: 'success',
          message: 'Attendance submitted & permanently locked. Status is now immutable.',
        });
        await fetchSessions();
        await fetchCompliance();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to lock session.',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Error submitting attendance.' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.enrollmentNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [records, searchQuery, statusFilter]);

  const defaultersCount = complianceStats.filter((s) => s.isDefaulter).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Course & Section</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
              Trimester 2
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">Data Structures (CS-301)</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            Section A • 15 Enrolled Students
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Today&apos;s Lecture</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                currentSession?.isLocked
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {currentSession?.isLocked ? 'Locked' : 'Draft Pending'}
            </span>
          </div>
          <div className="text-lg font-bold text-slate-900">Lecture #25</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            AVL Rotations & Trees
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Completed Sessions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">24 Sessions</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
            <Check className="w-3 h-3" /> 100% on-time submission rate
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Compliance Alert</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{defaultersCount} Students</div>
          <div className="text-xs text-rose-700/80 mt-1 font-medium">
            Below 75% required attendance
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
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
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Classroom Attendance Marking Interface */}
      {activeTab === 'marking' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Bar with Session Selector and Lock Status */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-50/70">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  {currentSession?.sessionTitle || 'Class Attendance Marking'}
                </h2>
                {currentSession?.isLocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-300">
                    <Lock className="w-3 h-3 text-slate-600" /> Locked & Immutable
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                    ● Marking Active (Draft)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Date: {currentSession?.lectureDate} • Section: Computer-A • Faculty: Prof. Rajesh Sharma
              </p>
            </div>

            {/* Quick Session Switcher Dropdown */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="text-xs text-slate-600 font-semibold whitespace-nowrap hidden sm:inline">
                Select Lecture:
              </span>
              <select
                value={selectedSessionId}
                onChange={(e) => {
                  const s = sessions.find((item) => item.id === e.target.value);
                  if (s) handleSelectSession(s);
                }}
                className="bg-white border border-slate-300 text-xs text-slate-800 rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto shadow-2xs"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.sessionNumber} - {s.lectureDate} {s.isLocked ? '(🔒 Locked)' : '(Active Draft)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Toolbar & Bulk Controls */}
          {!currentSession?.isLocked && (
            <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-mark-all-present"
                  onClick={() => handleMarkAll('PRESENT')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mark All Present
                </button>
                <button
                  id="btn-mark-all-absent"
                  onClick={() => handleMarkAll('ABSENT')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Mark All Absent
                </button>
                <button
                  id="btn-copy-prev-session"
                  onClick={handleCopyPrevious}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  Copy Prev Session
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                  Save Draft
                </button>
                <button
                  id="btn-submit-lock-session"
                  onClick={() => setIsLockModalOpen(true)}
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                  <Lock className="w-3.5 h-3.5 text-white" />
                  Submit & Lock Attendance
                </button>
              </div>
            </div>
          )}

          {/* Real-time Dynamic Counter Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 sm:grid-cols-7 gap-2 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] text-slate-500 font-semibold">Total</div>
              <div className="text-base font-bold text-slate-900">{summary.total}</div>
            </div>
            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="text-[10px] text-emerald-800 font-semibold">Present (P)</div>
              <div className="text-base font-bold text-emerald-700">{summary.present}</div>
            </div>
            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 shadow-2xs">
              <div className="text-[10px] text-rose-800 font-semibold">Absent (A)</div>
              <div className="text-base font-bold text-rose-700">{summary.absent}</div>
            </div>
            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[10px] text-amber-800 font-semibold">Late (L)</div>
              <div className="text-base font-bold text-amber-700">{summary.late}</div>
            </div>
            <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
              <div className="text-[10px] text-blue-800 font-semibold">Excused (E)</div>
              <div className="text-base font-bold text-blue-700">{summary.excused}</div>
            </div>
            <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-200 shadow-2xs">
              <div className="text-[10px] text-purple-800 font-semibold">Medical (M)</div>
              <div className="text-base font-bold text-purple-700">{summary.medical}</div>
            </div>
            <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200 shadow-2xs">
              <div className="text-[10px] text-sky-800 font-semibold">On Duty (O)</div>
              <div className="text-base font-bold text-sky-700">{summary.onDuty}</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search name or roll number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-600 font-medium">Filter Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-xl px-3 py-1.5 font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
                <option value="MEDICAL_LEAVE">Medical Leave</option>
                <option value="ON_DUTY">On Duty</option>
              </select>
            </div>
          </div>

          {/* Interactive Student Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-center">Quick Toggles</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.map((stu, index) => {
                  const isLocked = !!currentSession?.isLocked;
                  return (
                    <tr
                      key={stu.studentId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        stu.status === 'ABSENT'
                          ? 'bg-rose-50/30'
                          : stu.status === 'LATE'
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {stu.enrollmentNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-semibold">
                        {stu.studentName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                            stu.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : stu.status === 'ABSENT'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : stu.status === 'LATE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : stu.status === 'EXCUSED'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : stu.status === 'MEDICAL_LEAVE'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {stu.status}
                        </span>
                      </td>

                      {/* Quick Toggles */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'PRESENT')}
                            title="Mark Present"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            P
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'ABSENT')}
                            title="Mark Absent"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-sm ring-1 ring-rose-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            A
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'LATE')}
                            title="Mark Late"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'LATE'
                                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            L
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'EXCUSED')}
                            title="Mark Excused"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'EXCUSED'
                                ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            E
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'MEDICAL_LEAVE')}
                            title="Medical Leave"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'MEDICAL_LEAVE'
                                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            M
                          </button>
                          <button
                            disabled={isLocked}
                            onClick={() => handleStatusChange(stu.studentId, 'ON_DUTY')}
                            title="On Duty"
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                              stu.status === 'ON_DUTY'
                                ? 'bg-sky-600 text-white shadow-sm ring-1 ring-sky-700'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            O
                          </button>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder={isLocked ? '-' : 'Add remark...'}
                          value={stu.remarks || ''}
                          disabled={isLocked}
                          onChange={(e) => handleRemarksChange(stu.studentId, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-transparent"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Sessions History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Completed Attendance Sessions Log</h3>
              <p className="text-xs text-slate-500">All submitted records locked and recorded in database</p>
            </div>
            {onOpenUniversityReport && (
              <button
                onClick={() => onOpenUniversityReport('course-ds', 'sec-ds-a')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Award className="w-3.5 h-3.5" /> Official Board Report
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Lecture Title</th>
                  <th className="py-3 px-4">Present / Total</th>
                  <th className="py-3 px-4">Attendance %</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sessions
                  .slice()
                  .reverse()
                  .map((s) => {
                    const pct = s.summary.totalStudents
                      ? Math.round((s.summary.presentCount / s.summary.totalStudents) * 100)
                      : 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-slate-400">#{s.sessionNumber}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">{s.lectureDate}</td>
                        <td className="py-3 px-4 text-slate-900 font-bold">{s.sessionTitle}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {s.summary.presentCount} / {s.summary.totalStudents}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{pct}%</td>
                        <td className="py-3 px-4">
                          {s.isLocked ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1 w-fit">
                              <Lock className="w-2.5 h-2.5 text-slate-500" /> Locked
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold w-fit">
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              handleSelectSession(s);
                            }}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 75% Compliance Defaulter Monitor Tab */}
      {activeTab === 'compliance' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                75% Attendance Compliance Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Section: Data Structures (CS-301) Section A • Threshold Requirement: 75.0%
              </p>
            </div>
            <div className="text-xs px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold">
              {defaultersCount} Defaulters Detected
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Attended / Total</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Compliance Status</th>
                  <th className="py-3 px-4">Recovery Action Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {complianceStats.map((stu) => (
                  <tr
                    key={stu.studentId}
                    className={`hover:bg-slate-50/80 ${
                      stu.isDefaulter ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {stu.enrollmentNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-bold">{stu.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {stu.attendedLectures} / {stu.totalLectures}
                    </td>
                    <td className="py-3 px-4 font-bold text-sm">
                      <span className={stu.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}>
                        {stu.percentage}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {stu.isDefaulter ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Defaulter (&lt;75%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          <Check className="w-3 h-3 text-emerald-600" /> Compliant
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {stu.isDefaulter ? (
                        <span className="text-amber-800 font-bold text-xs">
                          Requires {stu.neededFor75} consecutive presences to reach 75%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">In good standing</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Immutability Locking */}
      {isLockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Submit & Permanently Lock Attendance?
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Under institutional regulatory rules, **submitted attendance is strictly immutable**.
                Once submitted:
              </p>
              <ul className="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
                <li>You cannot edit or unmark students for this session.</li>
                <li>The attendance percentage of all students will recalculate immediately.</li>
                <li>Any exception or correction requires formal HOD audit approval.</li>
              </ul>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
              <div className="flex justify-between py-0.5">
                <span>Present:</span>
                <span className="font-bold text-emerald-700">{summary.present}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Absent:</span>
                <span className="font-bold text-rose-700">{summary.absent}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Total Enrolled:</span>
                <span className="font-bold text-slate-900">{summary.total}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsLockModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all border border-slate-200"
              >
                Cancel & Review
              </button>
              <button
                onClick={handleConfirmSubmitAndLock}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Yes, Lock & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
