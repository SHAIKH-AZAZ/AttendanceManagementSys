'use client';

import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import type { AttendanceStatus } from '@/types';
import { TOKENS } from '@/theme';
import { ATTENDANCE_STATUS, Card, EmptyState, ProgressBar, SegmentedControl, SelectField, StatusBadge } from '@/components/ui';

export interface HistoryEntry {
  sessionId: string;
  lectureDate: string;
  courseCode: string;
  sessionNumber: number;
  sessionTitle: string;
  periods: number;
  isLab: boolean;
  status: AttendanceStatus;
  remarks?: string;
}

interface CourseSummary {
  code: string;
  title: string;
  total: number;
  attended: number;
  percentage: number;
  isDefaulter: boolean;
}

/** Only an absence counts against attendance; late, excused, medical and on duty count as attended. */
export type HistoryFilter = 'ALL' | 'MISSED' | 'ATTENDED';
const missed = (h: HistoryEntry) => h.status === 'ABSENT';

const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
/** The topic without a leading "Lecture 12:" (the number is shown on the line below). */
const topic = (h: HistoryEntry) =>
  h.sessionTitle.trim().replace(new RegExp(`^Lecture\\s*${h.sessionNumber}\\s*[:·-]?\\s*`, 'i'), '') || `Lecture ${h.sessionNumber}`;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

export function LectureHistory({
  history,
  courses,
  overallPercentage,
  overallAttended,
  overallTotal,
  course,
  onCourse,
  filter,
  onFilter,
}: {
  history: HistoryEntry[];
  courses: CourseSummary[];
  overallPercentage: number;
  overallAttended: number;
  overallTotal: number;
  course: string;
  onCourse: (code: string) => void;
  filter: HistoryFilter;
  onFilter: (f: HistoryFilter) => void;
}) {
  const inCourse = useMemo(() => history.filter((h) => course === 'ALL' || h.courseCode === course), [history, course]);
  const shown = useMemo(
    () => inCourse.filter((h) => filter === 'ALL' || (filter === 'MISSED' ? missed(h) : !missed(h))),
    [inCourse, filter]
  );

  // Month groups, newest first (history arrives newest first).
  const months = useMemo(() => {
    const groups: { key: string; items: HistoryEntry[] }[] = [];
    for (const h of shown) {
      const key = monthKey(h.lectureDate);
      if (groups.at(-1)?.key !== key) groups.push({ key, items: [] });
      groups.at(-1)!.items.push(h);
    }
    return groups;
  }, [shown]);

  // Percentages come from the server summary, so they always match the overview.
  const selected = courses.find((c) => c.code === course);
  const pct = selected ? selected.percentage : overallPercentage;
  const attended = selected ? selected.attended : overallAttended;
  const total = selected ? selected.total : overallTotal;
  const missedCount = inCourse.filter(missed).length;
  const below = pct < 75;

  return (
    <div className="space-y-5">
      {/* Summary: standing plus every lecture in order */}
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="min-w-[12rem] flex-1">
            <p className="text-sm text-slate-500">{selected ? `${selected.code} · ${selected.title}` : 'All courses'}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className={`text-4xl font-bold tracking-tight ${below ? 'text-rose-600' : 'text-emerald-700'}`}>{pct}%</span>
              <span className="text-sm text-slate-500">
                {attended} of {total} periods attended
              </span>
            </p>
            <div className="mt-3 max-w-md">
              <ProgressBar value={pct} />
            </div>
          </div>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-slate-500">Lectures</dt>
              <dd className="text-xl font-bold text-slate-800">{inCourse.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Missed</dt>
              <dd className={`text-xl font-bold ${missedCount ? 'text-rose-600' : 'text-slate-800'}`}>{missedCount}</dd>
            </div>
          </dl>
        </div>

        {inCourse.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 text-2xs text-slate-500">Oldest to newest</p>
            {/* Decorative: the list below carries the same information as text. */}
            <div className="flex flex-wrap gap-1" aria-hidden>
              {[...inCourse].reverse().map((h) => (
                <span
                  key={h.sessionId}
                  title={`${h.lectureDate} · ${ATTENDANCE_STATUS[h.status].label}`}
                  className="h-3 w-3 rounded-[3px]"
                  style={{ background: missed(h) ? TOKENS.bad : h.status === 'PRESENT' ? TOKENS.good : ATTENDANCE_STATUS[h.status].color }}
                />
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl<HistoryFilter>
          label="Show lectures"
          value={filter}
          onChange={onFilter}
          options={[
            { value: 'ALL', label: 'All', count: inCourse.length },
            { value: 'MISSED', label: 'Missed', count: missedCount },
            { value: 'ATTENDED', label: 'Attended', count: inCourse.length - missedCount },
          ]}
        />
        {courses.length > 1 && (
          <SelectField
            ariaLabel="Course"
            value={course}
            onChange={onCourse}
            minWidth={220}
            fullWidth={false}
            options={[{ value: 'ALL', label: 'All courses' }, ...courses.map((c) => ({ value: c.code, label: `${c.code} · ${c.title}` }))]}
          />
        )}
      </div>

      {/* Lectures by month */}
      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={History}
            title={filter === 'MISSED' ? 'No missed lectures' : 'Nothing to show'}
            description={
              filter === 'MISSED'
                ? 'You attended every submitted lecture here.'
                : 'Lectures appear here once your teacher submits attendance.'
            }
          />
        </Card>
      ) : (
        months.map(({ key, items }) => {
          const monthMissed = items.filter(missed).length;
          return (
            <section key={key} aria-labelledby={`month-${key}`}>
              <h2 id={`month-${key}`} className="mb-2 flex items-baseline gap-2 px-1">
                <span className="text-sm font-semibold text-slate-800">{monthLabel(key)}</span>
                <span className="text-xs text-slate-500">
                  {items.length} {items.length === 1 ? 'lecture' : 'lectures'}
                  {filter === 'ALL' && monthMissed > 0 && <span className="text-rose-600"> · {monthMissed} missed</span>}
                </span>
              </h2>
              <Card padded={false}>
                <ol className="divide-y divide-slate-100">
                  {items.map((h) => {
                    const d = day(h.lectureDate);
                    return (
                      <li
                        key={h.sessionId}
                        className="flex items-center gap-3 px-4 py-3 sm:gap-4"
                        style={missed(h) ? { boxShadow: `inset 3px 0 0 ${TOKENS.bad}`, background: 'rgba(253,236,231,.35)' } : undefined}
                      >
                        <time dateTime={h.lectureDate.slice(0, 10)} className="w-11 shrink-0 text-center leading-tight">
                          <span className="block text-lg font-bold text-slate-800">{d.getDate()}</span>
                          <span className="block text-2xs uppercase text-slate-500">
                            {d.toLocaleDateString('en-IN', { weekday: 'short' })}
                          </span>
                        </time>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-semibold leading-snug text-slate-800">{topic(h)}</p>
                          <p className="text-xs text-slate-500">
                            {h.courseCode} · Lecture {h.sessionNumber}
                            {h.isLab && ' · Lab'}
                            {h.periods > 1 && ` · ${h.periods} periods`}
                          </p>
                          {h.remarks && <p className="mt-0.5 text-xs italic text-slate-600">“{h.remarks}”</p>}
                        </div>
                        <StatusBadge status={h.status} />
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
