'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import type { Meta } from '@/hooks/useMeta';
import type { CalendarEvent, ExamType } from '@/types';
import { todayIST } from '@/lib/rules';
import { Badge, Button, Card, CardHeader, EmptyState, Modal, type NoticeTone, PageHeader, SelectField, formatDate } from '@/components/ui';
import type { ScheduleExam } from '@/components/schedule/ScheduleTab';
import { CalendarPlus, CalendarDays, ClipboardList, Trash2 } from 'lucide-react';

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'MID_SEM', label: 'Mid-semester exam' },
  { value: 'UNIT_TEST', label: 'Unit test' },
  { value: 'PRACTICAL', label: 'Practical exam' },
  { value: 'VIVA', label: 'Viva' },
  { value: 'GTU_EXTERNAL', label: 'GTU external exam' },
  { value: 'OTHER', label: 'Other' },
];

/** Admin / exam cell: publish the exam timetable and the academic calendar. */
export function ScheduleAdminTab({ meta, notify }: { meta: Meta; notify: (n: { tone: NoticeTone; text: string }) => void }) {
  const [data, setData] = useState<{ exams: ScheduleExam[]; events: CalendarEvent[] }>({ exams: [], events: [] });
  const [examOpen, setExamOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [exam, setExam] = useState({ courseId: meta.courses[0]?.id ?? '', examType: 'MID_SEM' as ExamType, divisions: '', date: todayIST(), start: '10:00', end: '11:30', room: '', note: '' });
  const [event, setEvent] = useState({ title: '', kind: 'HOLIDAY' as CalendarEvent['kind'], date: todayIST(), endDate: '', audience: 'ALL' as CalendarEvent['audience'] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/schedule?from=${todayIST()}`);
    if (res.ok) setData(await res.json());
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const post = async (url: string, body: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save.');
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (url: string, what: string) => {
    const res = await fetch(url, { method: 'DELETE' });
    notify(res.ok ? { tone: 'success', text: `${what} removed.` } : { tone: 'error', text: `Could not remove the ${what.toLowerCase()}.` });
    load();
  };

  return (
    <>
      <PageHeader
        title="Exams & calendar"
        description="Publish the exam timetable and holidays. Students of the listed divisions and their teachers are notified."
        actions={
          <>
            <Button icon={CalendarPlus} onClick={() => { setError(null); setEventOpen(true); }}>Add holiday or event</Button>
            <Button variant="primary" icon={ClipboardList} disabled={!meta.courses.length} onClick={() => { setError(null); setExamOpen(true); }}>Schedule exam</Button>
          </>
        }
      />

      <Card padded={false} className="mb-5">
        <div className="p-5 pb-3"><CardHeader title="Upcoming exams" /></div>
        {data.exams.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No upcoming exams" />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2.5 }}>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Divisions</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.exams.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ pl: 2.5 }} className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.start}–{e.end}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-500 mr-2">{e.courseCode}</span>
                      {e.courseTitle}
                    </TableCell>
                    <TableCell>{e.typeLabel}</TableCell>
                    <TableCell>{e.divisions.join(', ')}</TableCell>
                    <TableCell>{e.room || '—'}</TableCell>
                    <TableCell align="right">
                      <IconButton aria-label={`Remove ${e.courseCode} exam on ${e.date}`} onClick={() => remove(`/api/admin/exams/${e.id}`, 'Exam')}>
                        <Trash2 size={16} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 pb-3"><CardHeader title="Calendar" description="Holidays block lectures from being entered on those days." /></div>
        {data.events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming holidays or events" />
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-200">
            {data.events.map((e) => (
              <li key={e.id} className="px-5 py-3 flex items-center gap-3">
                <Badge tone={e.kind === 'HOLIDAY' ? 'bad' : e.kind === 'DEADLINE' ? 'warn' : 'accent'}>{e.kind === 'HOLIDAY' ? 'Holiday' : e.kind === 'DEADLINE' ? 'Deadline' : 'Event'}</Badge>
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-slate-800">{e.title}</span>
                  <span className="text-sm text-slate-500"> · {formatDate(e.date)}{e.endDate ? ` to ${formatDate(e.endDate)}` : ''}{e.audience !== 'ALL' ? ` · ${e.audience.toLowerCase()} only` : ''}</span>
                </span>
                <IconButton aria-label={`Remove ${e.title}`} onClick={() => remove(`/api/admin/events/${e.id}`, 'Event')}>
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={examOpen}
        onClose={() => setExamOpen(false)}
        icon={ClipboardList}
        title="Schedule exam"
        description="Clashes for the same division or room are refused."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setExamOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="add-exam" loading={busy}>Publish exam</Button>
          </>
        }
      >
        <form
          id="add-exam"
          className="grid sm:grid-cols-2 gap-4 pt-1"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const d = await post('/api/admin/exams', { ...exam, divisions: exam.divisions.split(/[,+\s]+/).filter(Boolean) });
            if (d) {
              setExamOpen(false);
              notify({ tone: 'success', text: 'Exam published. Students and teachers have been notified.' });
              load();
            }
          }}
        >
          <SelectField id="exam-subject" label="Subject" value={exam.courseId} onChange={(v) => setExam({ ...exam, courseId: v })} options={meta.courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.title}` }))} />
          <SelectField<ExamType> id="exam-type" label="Type" value={exam.examType} onChange={(v) => setExam({ ...exam, examType: v })} options={EXAM_TYPES} />
          <TextField id="exam-divisions" label="Divisions" required value={exam.divisions} onChange={(e) => setExam({ ...exam, divisions: e.target.value })} placeholder="5CEA, 5CEB" slotProps={{ inputLabel: { shrink: true } }} />
          <TextField id="exam-room" label="Room (optional)" value={exam.room} onChange={(e) => setExam({ ...exam, room: e.target.value })} placeholder="8109" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 20 } }} />
          <TextField id="exam-date" label="Date" type="date" required value={exam.date} onChange={(e) => setExam({ ...exam, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="exam-start" label="Start" type="time" required value={exam.start} onChange={(e) => setExam({ ...exam, start: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField id="exam-end" label="End" type="time" required value={exam.end} onChange={(e) => setExam({ ...exam, end: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          </div>
          <div className="sm:col-span-2">
            <TextField id="exam-note" label="Note (optional)" value={exam.note} onChange={(e) => setExam({ ...exam, note: e.target.value })} placeholder="Syllabus: units 1–3" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>

      <Modal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        icon={CalendarPlus}
        title="Add to calendar"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="add-event" loading={busy}>Add</Button>
          </>
        }
      >
        <form
          id="add-event"
          className="grid grid-cols-2 gap-4 pt-1"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const d = await post('/api/admin/events', { ...event, endDate: event.endDate || undefined });
            if (d) {
              setEventOpen(false);
              notify({ tone: 'success', text: `${event.title} added to the calendar.` });
              setEvent({ ...event, title: '', endDate: '' });
              load();
            }
          }}
        >
          <div className="col-span-2">
            <TextField id="event-title" label="Title" required value={event.title} onChange={(e) => setEvent({ ...event, title: e.target.value })} placeholder="Diwali vacation" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 100 } }} />
          </div>
          <SelectField<CalendarEvent['kind']> id="event-kind" label="Kind" value={event.kind} onChange={(v) => setEvent({ ...event, kind: v })} options={[{ value: 'HOLIDAY', label: 'Holiday' }, { value: 'EVENT', label: 'Event' }, { value: 'DEADLINE', label: 'Deadline' }]} />
          <SelectField<CalendarEvent['audience']> id="event-audience" label="Shown to" value={event.audience} onChange={(v) => setEvent({ ...event, audience: v })} options={[{ value: 'ALL', label: 'Everyone' }, { value: 'STUDENTS', label: 'Students' }, { value: 'STAFF', label: 'Staff' }]} />
          <TextField id="event-date" label="From" type="date" required value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField id="event-end" label="To (optional)" type="date" value={event.endDate} onChange={(e) => setEvent({ ...event, endDate: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: event.date } }} />
          {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
