'use client';

import React from 'react';
import { ArrowRight, BookOpen, CalendarDays, CircleCheck, CircleX, FileClock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge, Card, EmptyState, ProgressBar, StatCard } from '@/components/ui';
import { TOKENS } from '@/theme';
import { StreakBadge, lectureStreak } from './StreakBadge';

export interface OverviewCourse {
  courseId: string;
  code: string;
  title: string;
  total: number;
  attended: number;
  percentage: number;
  isDefaulter: boolean;
}

interface Props {
  totalPeriods: number;
  attended: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
  isCompliant: boolean;
  courses: OverviewCourse[];
  history: { status: string }[];
  pendingLeaves: number;
  onViewMissed: () => void;
  onViewLeaves: () => void;
  onApply: () => void;
}

/** Periods in a row needed to get back to 75%: (a + x) / (t + x) >= 0.75. */
export const neededFor75 = (attended: number, total: number) =>
  Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));

/** Periods that can still be missed while staying at 75%: a / (t + x) >= 0.75. */
const canMiss = (attended: number, total: number) => Math.max(0, Math.floor(attended / 0.75 - total));

const R = 54;
const C = 2 * Math.PI * R;

/** Ring gauge: filled arc = attendance, tick at 75%. Decorative; the number beside it is the real content. */
function Ring({ value, ok }: { value: number; ok: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  const tick = (75 / 100) * 2 * Math.PI; // angle from 12 o'clock
  const x = (r: number) => 70 + r * Math.sin(tick);
  const y = (r: number) => 70 - r * Math.cos(tick);
  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={R} fill="none" stroke={TOKENS.fill} strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke={ok ? TOKENS.good : TOKENS.bad}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * C} ${C}`}
        />
      </svg>
      {/* 75% marker, drawn unrotated so the maths stays plain */}
      <svg viewBox="0 0 140 140" className="absolute inset-0 h-full w-full" aria-hidden>
        <line x1={x(46)} y1={y(46)} x2={x(62)} y2={y(62)} stroke={TOKENS.ink} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tracking-tight ${ok ? 'text-emerald-700' : 'text-rose-600'}`}>{v}%</span>
        <span className="text-2xs text-slate-500">75% required</span>
      </div>
    </div>
  );
}

export function StudentOverview(p: Props) {
  const need = neededFor75(p.attended, p.totalPeriods);
  const streak = lectureStreak(p.history);
  const spare = canMiss(p.attended, p.totalPeriods);
  // Worst first: that is where the student should look.
  const courses = [...p.courses].sort((a, b) => a.percentage - b.percentage);

  return (
    <div className="space-y-6">
      {/* Standing */}
      <Card>
        {p.totalPeriods === 0 ? (
          <EmptyState icon={BookOpen} title="No attendance yet" description="Your percentage appears after your first lecture is submitted by faculty." />
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
            <Ring value={p.percentage} ok={p.isCompliant} />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  p.isCompliant ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {p.isCompliant ? <ShieldCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
                {p.isCompliant ? 'On track' : 'Below 75%'}
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-800">
                {p.isCompliant ? (
                  spare > 0 ? <>You can miss {spare} more {spare === 1 ? 'period' : 'periods'}</> : <>Don&apos;t miss the next period</>
                ) : (
                  <>Attend the next {need} {need === 1 ? 'period' : 'periods'} in a row</>
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {p.isCompliant
                  ? `${p.attended} of ${p.totalPeriods} periods count as attended. ${spare > 0 ? 'Going lower drops you under the line.' : 'One more absence takes you under 75%.'}`
                  : `${p.attended} of ${p.totalPeriods} periods count as attended. Missed lectures for a valid reason? Apply for leave with proof.`}
              </p>
              {p.history.length > 0 && (
                <div className="mt-4">
                  <StreakBadge {...streak} />
                </div>
              )}
              {!p.isCompliant && (
                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={p.onViewMissed}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    See missed lectures <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={p.onApply}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    Apply for leave
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Periods held" value={p.totalPeriods} />
        <StatCard icon={CircleCheck} label="Periods present" value={p.presentCount} tone="good" />
        <StatCard
          icon={CircleX}
          label="Periods absent"
          value={p.absentCount}
          tone={p.absentCount ? 'bad' : 'neutral'}
          hint={p.absentCount ? 'View missed lectures' : undefined}
          onClick={p.onViewMissed}
        />
        <StatCard
          icon={FileClock}
          label="Leave requests"
          value={p.pendingLeaves}
          hint={p.pendingLeaves ? 'Waiting for HOD' : 'None pending'}
          tone={p.pendingLeaves ? 'warn' : 'neutral'}
          onClick={p.onViewLeaves}
        />
      </div>

      {/* Courses */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-slate-800">By course</h2>
          {courses.length > 1 && <span className="text-xs text-slate-500">Lowest first</span>}
        </div>
        {courses.length === 0 ? (
          <Card><EmptyState icon={BookOpen} title="No courses with attendance yet" /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const left = c.isDefaulter ? neededFor75(c.attended, c.total) : canMiss(c.attended, c.total);
              return (
                <Card key={c.courseId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge tone="accent">{c.code}</Badge>
                      <h3 className="mt-2 font-semibold leading-snug text-slate-800">{c.title}</h3>
                    </div>
                    <span className={`text-2xl font-bold tracking-tight ${c.isDefaulter ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {c.percentage}%
                    </span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={c.percentage} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500">{c.attended} of {c.total} periods</span>
                    <span className={`font-semibold ${c.isDefaulter ? 'text-rose-600' : 'text-slate-600'}`}>
                      {c.isDefaulter
                        ? `Needs ${left} in a row`
                        : left > 0
                          ? `Can miss ${left} more`
                          : 'No room to miss'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
