'use client';

import React, { useEffect, useState } from 'react';
import type { CalendarEvent, ExamSlot } from '@/types';
import { todayIST } from '@/lib/rules';
import { Badge, Button, Card, EmptyState, PageHeader, formatDate } from '@/components/ui';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

export type ScheduleExam = ExamSlot & { courseCode: string; courseTitle: string; typeLabel: string };
type Item = { date: string; kind: 'exam'; exam: ScheduleExam } | { date: string; kind: 'event'; event: CalendarEvent };

const EVENT_TONE = { HOLIDAY: 'bad', EVENT: 'accent', DEADLINE: 'warn' } as const;
const EVENT_LABEL = { HOLIDAY: 'Holiday', EVENT: 'Event', DEADLINE: 'Deadline' } as const;

const longDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Upcoming exams and calendar events for the signed-in user, grouped by date. */
export function ScheduleTab({ description }: { description: string }) {
  const [data, setData] = useState<{ exams: ScheduleExam[]; events: CalendarEvent[] } | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetch(showPast ? '/api/schedule' : `/api/schedule?from=${todayIST()}`)
      .then((r) => (r.ok ? r.json() : { exams: [], events: [] }))
      .then(setData);
  }, [showPast]);

  const items: Item[] = data
    ? [
        ...data.exams.map((exam) => ({ date: exam.date, kind: 'exam' as const, exam })),
        ...data.events.map((event) => ({ date: event.date, kind: 'event' as const, event })),
      ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'event' ? -1 : 1))
    : [];
  const byDate = items.reduce<Record<string, Item[]>>((acc, i) => ((acc[i.date] ??= []).push(i), acc), {});

  return (
    <>
      <PageHeader
        title="Schedule"
        description={description}
        actions={<Button variant="ghost" onClick={() => setShowPast((v) => !v)}>{showPast ? 'Upcoming only' : 'Include past'}</Button>}
      />
      {data === null ? (
        <Card><p className="text-sm text-slate-500">Loading…</p></Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Exams and holidays appear here when the college publishes them." />
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, list]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold text-slate-600 mb-2">
                {longDate(date)}
                {date === todayIST() && <Badge tone="accent" className="ml-2">Today</Badge>}
              </h2>
              <div className="space-y-2">
                {list.map((i) =>
                  i.kind === 'exam' ? (
                    <Card key={i.exam.id}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="info">{i.exam.typeLabel}</Badge>
                            <span className="font-mono text-xs text-slate-500">{i.exam.courseCode}</span>
                          </div>
                          <h3 className="mt-1 font-semibold text-slate-800">{i.exam.courseTitle}</h3>
                          {i.exam.note && <p className="text-sm text-slate-500 mt-0.5">{i.exam.note}</p>}
                        </div>
                        <div className="text-sm text-slate-600 flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                            <Clock className="w-4 h-4" /> {i.exam.start}–{i.exam.end}
                          </span>
                          {i.exam.room && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" /> Room {i.exam.room}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">{i.exam.divisions.join(', ')}</span>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <Card key={i.event.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={EVENT_TONE[i.event.kind]}>{EVENT_LABEL[i.event.kind]}</Badge>
                        <h3 className="font-semibold text-slate-800">{i.event.title}</h3>
                        {i.event.endDate && <span className="text-sm text-slate-500">until {formatDate(i.event.endDate)}</span>}
                      </div>
                      {i.event.note && <p className="text-sm text-slate-500 mt-1">{i.event.note}</p>}
                    </Card>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
