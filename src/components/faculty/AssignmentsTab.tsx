'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { MetaSection } from '@/hooks/useMeta';
import type { Assignment, StoredFile, Submission } from '@/types';
import { useUpload } from '@/hooks/useUpload';
import { Badge, Button, Card, DateTimeInput, EmptyState, Modal, Notice, type NoticeTone, PageHeader, SelectField } from '@/components/ui';
import { AttachButton, FileList } from '@/components/ui/FileList';
import { ArrowLeft, BookOpenCheck, Plus, Trash2 } from 'lucide-react';

type Row = Assignment & { counts: { students: number; submitted: number; late: number; graded: number } };
type RosterRow = {
  studentId: string;
  studentName: string;
  enrollmentNumber: string;
  submission: (Submission & { fileMeta: StoredFile[] }) | null;
};

const dueText = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** `<input type="datetime-local">` value for a date a few days ahead, at 23:59 local time. */
const defaultDue = () => {
  const d = new Date(Date.now() + 7 * 86400000);
  d.setHours(23, 59, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function AssignmentsTab({
  sections,
  classLabel,
  notify,
}: {
  sections: MetaSection[];
  classLabel: (id: string) => string;
  notify: (n: { tone: NoticeTone; text: string }) => void;
}) {
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [rows, setRows] = useState<Row[]>([]);
  const [detail, setDetail] = useState<{ assignment: Assignment; attachments: StoredFile[]; roster: RosterRow[] } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ title: '', instructions: '', dueAt: defaultDue(), maxMarks: '10', allowLate: true });
  const [grading, setGrading] = useState<RosterRow | null>(null);
  const [grade, setGrade] = useState({ marks: '', feedback: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUpload('ASSIGNMENT');

  const load = useCallback(async () => {
    if (!sectionId) return;
    const res = await fetch(`/api/assignments?sectionId=${sectionId}`);
    if (res.ok) setRows((await res.json()).assignments ?? []);
  }, [sectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    const res = await fetch(`/api/assignments/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const send = async (url: string, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await send('/api/assignments', {
      method: 'POST',
      body: JSON.stringify({
        sectionId,
        title: form.title,
        instructions: form.instructions,
        dueAt: new Date(form.dueAt).toISOString(),
        maxMarks: form.maxMarks === '' ? null : Number(form.maxMarks),
        allowLate: form.allowLate,
        attachments: upload.files.map((f) => f.id),
      }),
    });
    if (!data) return;
    setCreateOpen(false);
    notify({ tone: 'success', text: `“${data.assignment.title}” published. Students have been notified.` });
    load();
  };

  const saveGrade = async () => {
    if (!detail || !grading) return;
    const data = await send(`/api/assignments/${detail.assignment.id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ studentId: grading.studentId, marks: grade.marks === '' ? null : Number(grade.marks), feedback: grade.feedback }),
    });
    if (!data) return;
    setGrading(null);
    openDetail(detail.assignment.id);
    load();
  };

  if (!sections.length) return null;

  /* ---------------------------------------------------------------- Detail */
  if (detail) {
    const a = detail.assignment;
    return (
      <>
        <PageHeader
          back={<Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setDetail(null)}>All assignments</Button>}
          title={a.title}
          description={`${classLabel(a.sectionId)} · due ${dueText(a.dueAt)}${a.maxMarks !== null ? ` · out of ${a.maxMarks}` : ' · not graded with marks'}${a.allowLate ? '' : ' · no late submissions'}`}
          actions={
            detail.roster.every((r) => !r.submission) ? (
              <Button
                variant="danger"
                icon={Trash2}
                loading={busy}
                onClick={async () => {
                  if (await send(`/api/assignments/${a.id}`, { method: 'DELETE' })) {
                    notify({ tone: 'success', text: 'Assignment deleted.' });
                    setDetail(null);
                    load();
                  }
                }}
              >
                Delete
              </Button>
            ) : undefined
          }
        />
        {error && <Notice tone="error" className="mb-4">{error}</Notice>}
        {(a.instructions || detail.attachments.length > 0) && (
          <Card className="mb-5">
            {a.instructions && <p className="text-sm text-slate-700 whitespace-pre-line">{a.instructions}</p>}
            {detail.attachments.length > 0 && <div className="mt-3"><FileList files={detail.attachments} /></div>}
          </Card>
        )}
        <Card padded={false}>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2.5 }}>Student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Marks</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {detail.roster.map((r) => {
                  const s = r.submission;
                  return (
                    <TableRow key={r.studentId} hover>
                      <TableCell sx={{ pl: 2.5 }}>
                        <div className="font-semibold text-slate-800">{r.studentName}</div>
                        <div className="font-mono text-xs text-slate-500">{r.enrollmentNumber}</div>
                      </TableCell>
                      <TableCell>
                        {!s ? <Badge tone="neutral">Missing</Badge> : s.gradedAt ? <Badge tone="good">Graded</Badge> : s.isLate ? <Badge tone="warn">Late</Badge> : <Badge tone="info">Submitted</Badge>}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">{s ? dueText(s.submittedAt) : '—'}</TableCell>
                      <TableCell className="text-slate-600">{s?.gradedAt ? (s.marks ?? '✓') : '—'}</TableCell>
                      <TableCell align="right">
                        {s && (
                          <Button
                            size="sm"
                            variant={s.gradedAt ? 'ghost' : 'primary'}
                            onClick={() => {
                              setGrading(r);
                              setGrade({ marks: s.marks?.toString() ?? '', feedback: s.feedback ?? '' });
                              setError(null);
                            }}
                          >
                            {s.gradedAt ? 'View' : 'Grade'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Modal
          open={!!grading}
          onClose={() => setGrading(null)}
          icon={BookOpenCheck}
          title={grading?.studentName ?? ''}
          description={grading?.submission ? `Submitted ${dueText(grading.submission.submittedAt)}${grading.submission.isLate ? ' (late)' : ''}` : ''}
          size="lg"
          footer={
            <>
              <Button variant="ghost" onClick={() => setGrading(null)}>Close</Button>
              <Button variant="primary" loading={busy} onClick={saveGrade}>
                {grading?.submission?.gradedAt ? 'Update grade' : 'Save grade'}
              </Button>
            </>
          }
        >
          {grading?.submission && (
            <div className="flex flex-col gap-4">
              {grading.submission.text && <p className="text-sm text-slate-700 whitespace-pre-line rounded-lg bg-slate-50 border border-slate-200 p-3">{grading.submission.text}</p>}
              <FileList files={grading.submission.fileMeta} />
              <div className="grid sm:grid-cols-[8rem_1fr] gap-3">
                {a.maxMarks !== null && (
                  <TextField id="grade-marks" label={`Marks / ${a.maxMarks}`} type="number" value={grade.marks} onChange={(e) => setGrade({ ...grade, marks: e.target.value })} slotProps={{ htmlInput: { min: 0, max: a.maxMarks, step: 0.5 } }} />
                )}
                <TextField id="grade-feedback" label="Feedback (optional)" multiline minRows={2} value={grade.feedback} onChange={(e) => setGrade({ ...grade, feedback: e.target.value })} slotProps={{ htmlInput: { maxLength: 2000 } }} />
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
          )}
        </Modal>
      </>
    );
  }

  /* ------------------------------------------------------------------ List */
  return (
    <>
      <PageHeader
        title="Assignments"
        description="Publish work for a class, collect submissions and grade them."
        actions={
          <>
            <SelectField label="Subject · class" fullWidth={false} value={sectionId} onChange={setSectionId} minWidth={320} options={sections.map((s) => ({ value: s.id, label: classLabel(s.id) }))} />
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setForm({ title: '', instructions: '', dueAt: defaultDue(), maxMarks: '10', allowLate: true });
                upload.reset();
                setError(null);
                setCreateOpen(true);
              }}
            >
              New assignment
            </Button>
          </>
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="No assignments for this class" description="Students get a notification when you publish one." />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 680 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 2.5 }}>Assignment</TableCell>
                  <TableCell>Due</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Graded</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const overdue = Date.now() > Date.parse(r.dueAt);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ pl: 2.5 }}>
                        <div className="font-semibold text-slate-800">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.maxMarks !== null ? `Out of ${r.maxMarks}` : 'No marks'}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={overdue ? 'text-slate-500' : 'text-slate-800'}>{dueText(r.dueAt)}</span>
                        {overdue && <Badge className="ml-2">Closed</Badge>}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {r.counts.submitted}/{r.counts.students}
                        {r.counts.late > 0 && <span className="text-amber-700"> · {r.counts.late} late</span>}
                      </TableCell>
                      <TableCell className="text-slate-600">{r.counts.graded}/{r.counts.submitted}</TableCell>
                      <TableCell align="right">
                        <Button size="sm" variant={r.counts.submitted > r.counts.graded ? 'primary' : 'ghost'} onClick={() => openDetail(r.id)}>
                          {r.counts.submitted > r.counts.graded ? 'Grade' : 'Open'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon={BookOpenCheck}
        title="New assignment"
        description={classLabel(sectionId)}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="new-assignment" loading={busy} disabled={upload.uploading}>Publish</Button>
          </>
        }
      >
        <form id="new-assignment" onSubmit={create} className="grid sm:grid-cols-2 gap-4 pt-1">
          <div className="sm:col-span-2">
            <TextField id="asg-title" label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }} />
          </div>
          <div className="sm:col-span-2">
            <TextField id="asg-instructions" label="Instructions" multiline minRows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
          </div>
          <DateTimeInput id="asg-due" label="Due" required value={form.dueAt} onChange={(v) => setForm({ ...form, dueAt: v })} />
          <TextField id="asg-max" label="Marks (optional)" type="number" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} helperText="Leave empty for no marks" slotProps={{ htmlInput: { min: 1, max: 1000 } }} />
          <div className="sm:col-span-2">
            <FormControlLabel control={<Checkbox checked={form.allowLate} onChange={(e) => setForm({ ...form, allowLate: e.target.checked })} />} label="Accept late submissions (marked late)" />
          </div>
          <div className="sm:col-span-2 flex flex-col gap-2">
            <AttachButton onFiles={upload.add} uploading={upload.uploading} label="Attach worksheet or notes" />
            <FileList files={upload.files} onRemove={upload.remove} />
            {upload.error && <p className="text-sm text-rose-600">{upload.error}</p>}
          </div>
          {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
