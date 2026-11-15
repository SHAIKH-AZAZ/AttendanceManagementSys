'use client';

import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import MuiButton from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import {
  Printer,
  Download,
  X,
  Award,
  CheckCircle2,
  AlertTriangle,
  Building,
} from 'lucide-react';

interface UniversityReportModalProps {
  courseId: string;
  sectionId: string;
  onClose: () => void;
}

export const UniversityReportModal: React.FC<UniversityReportModalProps> = ({
  courseId,
  sectionId,
  onClose,
}) => {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(
          `/api/reports/university?courseId=${courseId}&sectionId=${sectionId}`
        );
        const data = await res.json();
        setReport(data);
      } catch (err) {
        console.error('Failed to load university report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [courseId, sectionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !report) {
    return (
      <Dialog open onClose={onClose} aria-label="Loading report">
        <div className="flex items-center gap-3 p-6 text-sm text-slate-600">
          {loading ? (
            <>
              <CircularProgress size={20} /> Preparing the board report…
            </>
          ) : (
            'The report could not be loaded. Close this and try again.'
          )}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      scroll="body"
      fullWidth
      maxWidth="md"
      aria-label="Examination board report"
      className="report-dialog"
      slotProps={{ paper: { sx: { borderRadius: 4, overflow: 'hidden' } } }}
    >
      <div className="flex flex-col">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Award className="w-4 h-4 text-amber-400" />
            Examination board submission format
          </div>
          <div className="flex items-center gap-2">
            <MuiButton variant="contained" size="small" startIcon={<Printer size={14} />} onClick={handlePrint}>
              Print / Save as PDF
            </MuiButton>
            <IconButton aria-label="Close report" onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#fff' } }}>
              <X size={20} />
            </IconButton>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 sm:p-10 space-y-6 text-xs bg-white text-slate-900" id="printable-report">
          {/* Institution Header */}
          <div className="border-b-2 border-slate-900 pb-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building className="w-6 h-6 text-slate-800" />
              <h1 className="text-xl font-serif font-bold tracking-wide uppercase text-slate-950">
                {report.institution.name}
              </h1>
            </div>
            <div className="text-xs font-serif font-semibold text-slate-700">
              {report.institution.campus} • {report.institution.department}
            </div>
            <div className="text-2xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Examination board eligibility and attendance transcript
            </div>
            <div className="flex justify-between items-center text-2xs text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <span>Doc Ref: <strong>{report.institution.documentRef}</strong></span>
              <span>Academic Session: <strong>{report.institution.academicSession}</strong> ({report.institution.term})</span>
              <span>Generated: <strong>{report.institution.generatedDate}</strong></span>
            </div>
          </div>

          {/* Course Details Block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-2xs text-slate-500 uppercase font-semibold">Course code</div>
              <div className="font-bold text-slate-900 font-mono">{report.course.code}</div>
            </div>
            <div>
              <div className="text-2xs text-slate-500 uppercase font-semibold">Course title</div>
              <div className="font-bold text-slate-900 truncate">{report.course.title}</div>
            </div>
            <div>
              <div className="text-2xs text-slate-500 uppercase font-semibold">Section / batch</div>
              <div className="font-bold text-slate-900">{report.course.section}</div>
            </div>
            <div>
              <div className="text-2xs text-slate-500 uppercase font-semibold">Course instructor</div>
              <div className="font-bold text-slate-900">{report.course.facultyName}</div>
            </div>
          </div>

          {/* Statistical Abstract */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="border border-slate-200 p-2.5 rounded-lg">
              <div className="text-2xs text-slate-500 uppercase">Total enrolled</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{report.metrics.totalEnrolled}</div>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/50 p-2.5 rounded-lg">
              <div className="text-2xs text-emerald-700 uppercase font-semibold">Eligible (≥ 75%)</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5">{report.metrics.compliantStudents}</div>
            </div>
            <div className="border border-rose-200 bg-rose-50/50 p-2.5 rounded-lg">
              <div className="text-2xs text-rose-700 uppercase font-semibold">Detained (&lt; 75%)</div>
              <div className="text-base font-bold text-rose-700 mt-0.5">{report.metrics.defaulterStudents}</div>
            </div>
            <div className="border border-slate-200 p-2.5 rounded-lg">
              <div className="text-2xs text-slate-500 uppercase">Class average</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{report.metrics.classAveragePercentage}%</div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-2xs uppercase font-bold tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-300 w-10">S.No</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Enrollment No.</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Student Name</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Periods held</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Periods attended</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">% Att.</th>
                  <th className="py-2.5 px-3 text-center">Board eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {report.students.map((stu: any, index: number) => (
                  <tr key={stu.studentId} className={stu.isDefaulter ? 'bg-rose-50/60' : ''}>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-500">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold">{stu.enrollmentNumber}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-900 font-semibold">{stu.fullName}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{stu.totalPeriods}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{stu.attendedPeriods}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                      {stu.percentage}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      {stu.isDefaulter ? (
                        <span className="text-2xs font-bold text-rose-700 uppercase">
                          Detained / Ineligible
                        </span>
                      ) : (
                        <span className="text-2xs font-bold text-emerald-700 uppercase">
                          Eligible for exam
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
            {report.signatories.map((sig: any, idx: number) => (
              <div key={idx} className="flex flex-col justify-end space-y-1">
                {/* Blank line for a handwritten signature on the printout */}
                <div className="border-b border-slate-400 h-12" aria-hidden="true" />
                <div className="font-bold text-slate-900 mt-2 min-h-4">{sig.name || '\u00a0'}</div>
                <div className="text-2xs text-slate-500">{sig.title}</div>
                <div className="text-2xs text-slate-400 font-medium">{sig.designation}</div>
              </div>
            ))}
          </div>

          <div className="text-2xs text-slate-400 text-center pt-4 border-t border-slate-100">
            Generated by AttendEASE365 from locked attendance records, counted in timetable periods.
            Valid only with the signatures above.
          </div>
        </div>
      </div>
    </Dialog>
  );
};
