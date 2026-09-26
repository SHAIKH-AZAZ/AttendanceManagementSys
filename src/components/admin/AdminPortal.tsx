'use client';

import React, { useState, useEffect } from 'react';
import {
  SystemAuditLog,
} from '@/types';
import {
  Building2,
  Layers,
  BookOpen,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  Sparkles,
  ExternalLink,
  Award,
} from 'lucide-react';
import { UserManagementTab } from './UserManagementTab';

interface AdminPortalProps {
  activeTab: string;
  onOpenUniversityReport?: (courseId: string, sectionId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  activeTab,
  onOpenUniversityReport,
}) => {
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Bulk Import state
  const [importSectionId, setImportSectionId] = useState('sec-ds-a');
  const [importText, setImportText] = useState('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchMetas = async () => {
    try {
      const logsRes = await fetch('/api/audit-logs');
      const logsJson = await logsRes.json();
      if (logsJson.logs) setAuditLogs(logsJson.logs);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchMetas();
  }, []);

  const handleLoadSampleCSV = () => {
    const sample = `CS-2026-101, Harshit Mehta, harshit.m@univ.edu
CS-2026-102, Riya Kapoor, riya.k@univ.edu
CS-2026-001, Duplicate Aarav, aarav.dupe@univ.edu
, Missing Roll Student, invalid@univ.edu
CS-2026-103, Tushar Saxena, tushar.s@univ.edu`;
    setImportText(sample);
    setPreviewResult(null);
  };

  const handleValidateCSV = async () => {
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    const parsedStudents = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        enrollmentNumber: parts[0] || '',
        fullName: parts[1] || '',
        email: parts[2] || '',
      };
    });

    setIsImporting(true);
    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: importSectionId,
          students: parsedStudents,
          isPreviewOnly: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreviewResult(data);
        setNotification({
          type: 'info',
          message: `Validation complete: ${data.validCount} valid, ${data.duplicateCount} duplicates, ${data.invalidCount} invalid rows.`,
        });
      } else {
        setNotification({ type: 'error', message: data.error || 'Validation failed.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Error validating roster.' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewResult || previewResult.validCount === 0) return;

    setIsImporting(true);
    try {
      const lines = importText.trim().split('\n');
      const parsedStudents = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          enrollmentNumber: parts[0] || '',
          fullName: parts[1] || '',
          email: parts[2] || '',
        };
      });

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: importSectionId,
          students: parsedStudents,
          isPreviewOnly: false,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({
          type: 'success',
          message: data.message || 'Roster committed successfully into section.',
        });
        setImportText('');
        setPreviewResult(null);
        fetchMetas();
      } else {
        setNotification({ type: 'error', message: data.error || 'Import failed.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error committing import.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Configured Campuses</span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">3 Campuses</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">North, South, City</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Departments</span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">4 Departments</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">Data-isolated tenants</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Active Term</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-base font-bold text-slate-900">Trimester 2 (2026-27)</div>
          <div className="text-xs text-emerald-600 mt-1 font-bold">● Active Session</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Audit Trail Entries</span>
            <History className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{auditLogs.length} Events</div>
          <div className="text-xs text-slate-500 mt-1 font-medium">System-wide immutable log</div>
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

      {/* Tab: Academic Hierarchy */}
      {activeTab === 'admin-config' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Multi-Campus & Department Topology</h3>
            <p className="text-xs text-slate-500 mb-4">
              Strict row-level isolation guarantees that department records remain separate across campuses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Building2 className="w-4 h-4" /> Campus 1: North Campus
                </div>
                <div className="mt-2 space-y-1.5 text-xs text-slate-700 font-medium">
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>CSE (Computer Science)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>IT (Information Tech)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>ECE (Electronics & Comm)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Building2 className="w-4 h-4" /> Campus 2: South Campus
                </div>
                <div className="mt-2 space-y-1.5 text-xs text-slate-700 font-medium">
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>CIVIL (Civil Engineering)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>CSE (Computer Science)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Building2 className="w-4 h-4" /> Campus 3: City Campus
                </div>
                <div className="mt-2 space-y-1.5 text-xs text-slate-700 font-medium">
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>IT (Information Tech)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                  <div className="p-2 rounded bg-white border border-slate-200/80 flex justify-between shadow-2xs">
                    <span>CIVIL (Civil Engineering)</span>
                    <span className="text-emerald-700 font-bold">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bulk CSV / Excel Import Engine */}
      {activeTab === 'admin-import' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Student Roster Bulk Import & Validation Engine
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports CSV & Excel rosters. Detects duplicate enrollment numbers, checks formatting, and
              validates records before commit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input & Upload */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Course & Section
                </label>
                <select
                  value={importSectionId}
                  onChange={(e) => setImportSectionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="sec-ds-a">Data Structures (CS-301) - Section A</option>
                  <option value="sec-ds-b">Data Structures (CS-301) - Section B</option>
                  <option value="sec-dbms-a">Database Management (CS-302) - Section A</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Paste CSV Rows (Enrollment Number, Full Name, Email)
                  </label>
                  <button
                    onClick={handleLoadSampleCSV}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    Load Test CSV Sample
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`CS-2026-101, Harshit Mehta, harshit.m@univ.edu\nCS-2026-102, Riya Kapoor, riya.k@univ.edu\nCS-2026-001, Duplicate Student, ...`}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="btn-validate-csv"
                  onClick={handleValidateCSV}
                  disabled={isImporting || !importText.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Validate & Preview
                </button>
                {previewResult && previewResult.validCount > 0 && (
                  <button
                    id="btn-commit-import"
                    onClick={handleCommitImport}
                    disabled={isImporting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" /> Commit {previewResult.validCount} Valid Records
                  </button>
                )}
              </div>
            </div>

            {/* Validation Feedback & Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Validation Preview Matrix
                </h4>

                {previewResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-[10px] text-slate-500 font-semibold">Total Rows</div>
                        <div className="text-base font-bold text-slate-900">
                          {previewResult.totalRecords}
                        </div>
                      </div>
                      <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <div className="text-[10px] text-emerald-800 font-semibold">Valid</div>
                        <div className="text-base font-bold text-emerald-700">
                          {previewResult.validCount}
                        </div>
                      </div>
                      <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200 shadow-2xs">
                        <div className="text-[10px] text-rose-800 font-semibold">Errors & Dupes</div>
                        <div className="text-base font-bold text-rose-700">
                          {previewResult.duplicateCount + previewResult.invalidCount}
                        </div>
                      </div>
                    </div>

                    {/* Detected duplicates */}
                    {previewResult.duplicates.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                        <div className="text-amber-800 font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Duplicate Enrollment Numbers Found:
                        </div>
                        <ul className="text-slate-700 mt-1 space-y-0.5 text-[11px] font-medium">
                          {previewResult.duplicates.map((d: any, idx: number) => (
                            <li key={idx}>
                              Row {d.row}: <strong className="font-mono text-slate-900">{d.enrollmentNumber}</strong> - {d.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Detected invalid format */}
                    {previewResult.invalidRecords.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                        <div className="text-rose-800 font-bold flex items-center gap-1 text-[11px]">
                          <XCircle className="w-3 h-3 text-rose-600" /> Missing Fields or Format Errors:
                        </div>
                        <ul className="text-slate-700 mt-1 space-y-0.5 text-[11px] font-medium">
                          {previewResult.invalidRecords.map((inv: any, idx: number) => (
                            <li key={idx}>
                              Row {inv.row}: {inv.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-500 font-medium">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    Enter CSV rows and click &quot;Validate & Preview&quot; to inspect errors before
                    saving.
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-500 pt-3 border-t border-slate-200 font-medium">
                Rule 7 Compliance: No duplicate enrollment numbers allowed within the same section.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: University Reports */}
      {activeTab === 'admin-reports' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Official University & Examination Board Reports
              </h3>
              <p className="text-xs text-slate-500">
                Institutional attendance reports with university headers, student rosters, compliance stats,
                and formal signature blocks.
              </p>
            </div>
            {onOpenUniversityReport && (
              <button
                onClick={() => onOpenUniversityReport('course-ds', 'sec-ds-a')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <Award className="w-4 h-4" /> Launch University Board Generator
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-indigo-700">Department Consolidation</div>
              <p className="text-xs text-slate-600 mt-1">
                Consolidated attendance across Computer Science & Engineering department (CS-301, CS-302, CS-303).
              </p>
              <button
                onClick={() => onOpenUniversityReport && onOpenUniversityReport('course-ds', 'sec-ds-a')}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
              >
                Preview Submission Template <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-xs font-bold text-purple-700">Cross-Campus Consolidation</div>
              <p className="text-xs text-slate-600 mt-1">
                Authorized administrator consolidation for North Campus and South Campus.
              </p>
              <button
                onClick={() => onOpenUniversityReport && onOpenUniversityReport('course-ds', 'sec-ds-a')}
                className="mt-3 text-xs text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
              >
                Generate Combined Audit PDF <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: System Audit Logs */}
      {activeTab === 'admin-audit' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              System Audit Trail & Immutability Logs
            </h3>
            <p className="text-xs text-slate-500">
              Append-only tamper-evident event log recording logins, attendance submissions, leave actions,
              and configuration updates.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-bold">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-indigo-700 border border-slate-200 font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.entityName}</td>
                    <td className="py-3 px-4 text-slate-800 max-w-sm truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: User Management */}
      {activeTab === 'admin-users' && <UserManagementTab />}
    </div>
  );
};
