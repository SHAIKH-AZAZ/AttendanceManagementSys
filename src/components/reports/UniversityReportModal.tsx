'use client';

import React, { useState, useEffect } from 'react';
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

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl text-white text-xs font-semibold animate-pulse">
          Generating University Board Attendance Dossier...
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto border border-slate-300 print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Award className="w-4 h-4 text-amber-400" />
            Official Examination Board Submission Format
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 sm:p-10 space-y-6 text-xs bg-white text-slate-900" id="printable-report">
          {/* Institution Header */}
          <div className="border-b-2 border-slate-900 pb-5 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Building className="w-6 h-6 text-slate-800" />
              <h1 className="text-xl font-serif font-black tracking-wide uppercase text-slate-950">
                {report.institution.name}
              </h1>
            </div>
            <div className="text-xs font-serif font-semibold text-slate-700">
              {report.institution.campus} • {report.institution.department}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">
              Official Examination Board Eligibility & Attendance Transcript
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <span>Doc Ref: <strong>{report.institution.documentRef}</strong></span>
              <span>Academic Session: <strong>{report.institution.academicSession}</strong> ({report.institution.term})</span>
              <span>Generated: <strong>{report.institution.generatedDate}</strong></span>
            </div>
          </div>

          {/* Course Details Block */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Course Code</div>
              <div className="font-bold text-slate-900 font-mono">{report.course.code}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Course Title</div>
              <div className="font-bold text-slate-900 truncate">{report.course.title}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Section / Batch</div>
              <div className="font-bold text-slate-900">{report.course.section}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Course Instructor</div>
              <div className="font-bold text-slate-900">{report.course.facultyName}</div>
            </div>
          </div>

          {/* Statistical Abstract */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="border border-slate-200 p-2.5 rounded-lg">
              <div className="text-[10px] text-slate-500 uppercase">Total Enrolled</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{report.metrics.totalEnrolled}</div>
            </div>
            <div className="border border-emerald-200 bg-emerald-50/50 p-2.5 rounded-lg">
              <div className="text-[10px] text-emerald-700 uppercase font-semibold">Eligible (≥ 75%)</div>
              <div className="text-base font-bold text-emerald-700 mt-0.5">{report.metrics.compliantStudents}</div>
            </div>
            <div className="border border-rose-200 bg-rose-50/50 p-2.5 rounded-lg">
              <div className="text-[10px] text-rose-700 uppercase font-semibold">Detained (&lt; 75%)</div>
              <div className="text-base font-bold text-rose-700 mt-0.5">{report.metrics.defaulterStudents}</div>
            </div>
            <div className="border border-slate-200 p-2.5 rounded-lg">
              <div className="text-[10px] text-slate-500 uppercase">Class Average</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{report.metrics.classAveragePercentage}%</div>
            </div>
          </div>

          {/* Student Roster Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider border-b border-slate-300">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-300 w-10">S.No</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Enrollment No.</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">Student Name</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Conducted</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">Attended</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">% Att.</th>
                  <th className="py-2.5 px-3 text-center">Board Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {report.students.map((stu: any, index: number) => (
                  <tr key={stu.studentId} className={stu.isDefaulter ? 'bg-rose-50/60' : ''}>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-500">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-slate-300 font-mono font-bold">{stu.enrollmentNumber}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-slate-900 font-semibold">{stu.fullName}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{stu.totalLectures}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center">{stu.attendedLectures}</td>
                    <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">
                      {stu.percentage}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      {stu.isDefaulter ? (
                        <span className="text-[10px] font-bold text-rose-700 uppercase">
                          Detained / Ineligible
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          Eligible for Exam
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center text-xs">
            {report.signatories.map((sig: any, idx: number) => (
              <div key={idx} className="flex flex-col justify-end space-y-1">
                <div className="border-b border-slate-400 pb-8 font-serif italic text-slate-400 text-[10px]">
                  [Digital Institutional Signature Verified]
                </div>
                <div className="font-bold text-slate-900 mt-2">{sig.name}</div>
                <div className="text-[10px] text-slate-500">{sig.title}</div>
                <div className="text-[9px] text-slate-400 font-medium">{sig.designation}</div>
              </div>
            ))}
          </div>

          <div className="text-[9px] text-slate-400 text-center pt-4 border-t border-slate-100">
            Certified that the attendance records documented above are generated from the tamper-evident
            AttendEASE365 institutional audit repository in accordance with University Academic Regulations.
          </div>
        </div>
      </div>
    </div>
  );
};
