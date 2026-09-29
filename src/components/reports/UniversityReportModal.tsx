'use client';

import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import type { UniversityReport } from '@/types';
import { formatPercent, THRESHOLD, useApi } from '@/lib/client';
import { Button, Dialog, LoadState, cn } from '@/components/ui';

interface UniversityReportModalProps {
  courseId: string;
  sectionId: string;
  onClose: () => void;
}

export function UniversityReportModal({ courseId, sectionId, onClose }: UniversityReportModalProps) {
  const q = useApi<UniversityReport>(
    `/api/reports/university?courseId=${encodeURIComponent(courseId)}&sectionId=${encodeURIComponent(sectionId)}`
  );
  const report = q.data;

  return (
    <>
      <Dialog
        size="xl"
        title="Attendance report"
        description={report ? `${report.course.code} ${report.course.title}, ${report.course.section}` : undefined}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => window.print()} disabled={!report}>
              <Printer aria-hidden /> Print or save as PDF
            </Button>
          </>
        }
      >
        {report ? (
          <div className="rounded-md border border-slate-200 bg-white px-6 py-8 sm:px-10">
            <ReportDocument report={report} />
          </div>
        ) : (
          <LoadState error={q.error} onRetry={q.reload} />
        )}
      </Dialog>
      {/* Printing hides everything except direct children of <body> marked .print-only (see globals.css). */}
      {report && createPortal(<div className="print-only"><ReportDocument report={report} /></div>, document.body)}
    </>
  );
}

function ReportDocument({ report }: { report: UniversityReport }) {
  const { institution, course, metrics } = report;
  const details: [string, string][] = [
    ['Reference', institution.documentRef],
    ['Academic year', `${institution.academicSession}, ${institution.term}`],
    ['Date of issue', institution.generatedDate],
    ['Course', `${course.code} ${course.title} (${course.credits} credits)`],
    ['Section', course.section],
    ['Course instructor', course.facultyName],
  ];

  return (
    <article className="text-slate-900">
      <header className="border-b-2 border-slate-900 pb-5 text-center">
        <p className="font-serif text-xl font-semibold tracking-wide">{institution.name}</p>
        <p className="mt-1 font-serif text-sm text-slate-700">
          {institution.department}, {institution.campus}
        </p>
        <h3 className="mt-4 font-serif text-lg font-semibold">Statement of attendance and examination eligibility</h3>
      </header>

      <dl className="mt-6 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 print:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="flex gap-3">
            <dt className="w-36 shrink-0 text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <dl className="mt-6 grid grid-cols-4 divide-x divide-slate-300 border border-slate-300 text-sm">
        {[
          ['Students assessed', metrics.totalEnrolled],
          [`Eligible (${THRESHOLD}% or more)`, metrics.compliantStudents],
          [`Not eligible (below ${THRESHOLD}%)`, metrics.defaulterStudents],
          ['Class average', `${metrics.classAveragePercentage}%`],
        ].map(([label, value]) => (
          <div key={label} className="px-3 py-3 sm:px-4">
            <dt className="text-xs text-slate-600">{label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-xs text-slate-700 print:bg-transparent">
            {['No.', 'Enrollment no.', 'Name', 'Lectures held', 'Attended', 'Attendance', 'Eligibility'].map((h, i) => (
              <th key={h} className={cn('border border-slate-300 px-3 py-2 font-medium', i >= 3 && i <= 5 && 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.students.map((s, index) => (
            <tr key={s.studentId} className="break-inside-avoid">
              <td className="border border-slate-300 px-3 py-1.5 text-slate-600 tabular-nums">{index + 1}</td>
              <td className="border border-slate-300 px-3 py-1.5 whitespace-nowrap tabular-nums">{s.enrollmentNumber}</td>
              <td className="border border-slate-300 px-3 py-1.5">{s.fullName}</td>
              <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">{s.totalLectures}</td>
              <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">{s.attendedLectures}</td>
              <td className="border border-slate-300 px-3 py-1.5 text-right tabular-nums">{formatPercent(s.percentage)}</td>
              <td className={cn('border border-slate-300 px-3 py-1.5 whitespace-nowrap', s.isDefaulter && 'font-semibold')}>
                {s.isDefaulter ? 'Not eligible' : 'Eligible'}
              </td>
            </tr>
          ))}
          {report.students.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-slate-300 px-3 py-6 text-center text-slate-500">
                No locked sessions have been recorded for this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-16 grid grid-cols-2 gap-x-8 gap-y-12 text-sm sm:grid-cols-4 print:grid-cols-4">
        {report.signatories.map((signatory) => (
          <div key={signatory.title} className="break-inside-avoid">
            <div className="h-10 border-b border-slate-500" />
            <p className="mt-2 font-medium">{signatory.name || ' '}</p>
            <p className="text-xs text-slate-600">{signatory.title}</p>
            <p className="text-xs text-slate-500">{signatory.designation}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
        Figures are calculated from locked attendance sessions only. Late, excused, medical leave and on-duty marks count
        as attended. A student needs at least {THRESHOLD}% attendance in the course to be eligible for its final
        examination.
      </p>
    </article>
  );
}
