'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import type { Assignment, StoredFile, Submission } from '@/types';
import { useUpload } from '@/hooks/useUpload';
import { isPast } from '@/lib/rules';
import { Badge, Button, Card, EmptyState, Notice, type NoticeTone, PageHeader, SegmentedControl } from '@/components/ui';
import { AttachButton, FileList } from '@/components/ui/FileList';
import { ArrowLeft, BookOpenCheck, Send } from 'lucide-react';

type Row = Assignment & { submission: Submission | null };
type Detail = { assignment: Assignment; attachments: StoredFile[]; submission: Submission | null; submissionFiles: StoredFile[]; canSubmit: boolean };

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function status(r: { dueAt: string; submission: Submission | null }) {
  if (r.submission?.gradedAt) return { label: 'Graded', tone: 'good' as const };
  if (r.submission) return { label: r.submission.isLate ? 'Submitted late' : 'Submitted', tone: r.submission.isLate ? ('warn' as const) : ('info' as const) };
  if (isPast(r.dueAt)) return { label: 'Overdue', tone: 'bad' as const };
  return { label: 'To do', tone: 'neutral' as const };
}

export function StudentAssignmentsTab({ notify }: { notify: (n: { tone: NoticeTone; text: string }) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<'TODO' | 'DONE'>('TODO');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const upload = useUpload('SUBMISSION');

  const load = useCallback(async () => {
    const res = await fetch('/api/assignments');
    if (res.ok) setRows((await res.json()).assignments ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id: string) => {
    const res = await fetch(`/api/assignments/${id}`);
    if (!res.ok) return;
    const d: Detail = await res.json();
    setDetail(d);
    setText(d.submission?.text ?? '');
    upload.reset(d.submissionFiles);
    setError(null);
  };

  const submit = async () => {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${detail.assignment.id}/submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, files: upload.files.map((f) => f.id) }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Could not submit.');
      notify({ tone: 'success', text: `Submitted “${detail.assignment.title}”${data.submission.isLate ? ' (late)' : ''}.` });
      setDetail(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- Detail */
  if (detail) {
    const a = detail.assignment;
    const s = detail.submission;
    const st = status({ dueAt: a.dueAt, submission: s });
    return (
      <>
        <PageHeader
          back={<Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setDetail(null)}>All assignments</Button>}
          title={a.title}
          description={`Due ${when(a.dueAt)}${a.maxMarks !== null ? ` · out of ${a.maxMarks}` : ''}${a.allowLate ? '' : ' · late work not accepted'}`}
          actions={<Badge tone={st.tone}>{st.label}</Badge>}
        />
        {(a.instructions || detail.attachments.length > 0) && (
          <Card className="mb-5">
            {a.instructions && <p className="text-sm text-slate-700 whitespace-pre-line">{a.instructions}</p>}
            {detail.attachments.length > 0 && <div className="mt-3"><FileList files={detail.attachments} /></div>}
          </Card>
        )}
        {s?.gradedAt && (
          <Notice tone="success" className="mb-5">
            <strong>Graded{s.marks !== null && s.marks !== undefined ? `: ${s.marks} / ${a.maxMarks}` : ''}.</strong>
            {s.feedback ? ` ${s.feedback}` : ''}
          </Notice>
        )}
        <Card>
          <h2 className="text-base font-semibold text-slate-800 mb-3">{s ? 'Your submission' : 'Submit your work'}</h2>
          {detail.canSubmit ? (
            <div className="flex flex-col gap-3">
              <TextField id="sub-text" label="Answer or note (optional if you attach a file)" multiline minRows={4} value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 10000 } }} />
              <AttachButton onFiles={upload.add} uploading={upload.uploading} />
              <FileList files={upload.files} onRemove={upload.remove} />
              {upload.error && <p className="text-sm text-rose-600">{upload.error}</p>}
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {isPast(a.dueAt) && <p className="text-sm text-amber-700">The deadline has passed; this will be marked late.</p>}
              <div>
                <Button variant="primary" icon={Send} loading={busy} disabled={upload.uploading || (!text.trim() && !upload.files.length)} onClick={submit}>
                  {s ? 'Resubmit' : 'Submit'}
                </Button>
              </div>
            </div>
          ) : s ? (
            <div className="flex flex-col gap-3">
              {s.text && <p className="text-sm text-slate-700 whitespace-pre-line">{s.text}</p>}
              <FileList files={detail.submissionFiles} />
              <p className="text-xs text-slate-500">Submitted {when(s.submittedAt)}{s.isLate ? ' (late)' : ''}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">The deadline has passed and this assignment no longer accepts submissions.</p>
          )}
        </Card>
      </>
    );
  }

  /* ------------------------------------------------------------------ List */
  const todo = (rows ?? []).filter((r) => !r.submission).sort((x, y) => x.dueAt.localeCompare(y.dueAt));
  const done = (rows ?? []).filter((r) => r.submission);
  const list = filter === 'TODO' ? todo : done;

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Work your teachers have set, with deadlines."
        actions={
          <SegmentedControl
            label="Assignments"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'TODO', label: 'To do', count: todo.length },
              { value: 'DONE', label: 'Submitted', count: done.length },
            ]}
          />
        }
      />
      {rows === null ? (
        <Card><p className="text-sm text-slate-500">Loading…</p></Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpenCheck} title={filter === 'TODO' ? 'Nothing to do' : 'Nothing submitted yet'} description={filter === 'TODO' ? 'New assignments appear here and in your notifications.' : undefined} />
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => {
            const st = status(r);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{r.title}</h3>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Due {when(r.dueAt)}
                      {r.submission?.gradedAt && r.submission.marks !== null && r.submission.marks !== undefined && ` · ${r.submission.marks} / ${r.maxMarks}`}
                    </p>
                  </div>
                  <Button size="sm" variant={r.submission ? 'ghost' : 'primary'} onClick={() => open(r.id)}>
                    {r.submission ? 'View' : 'Open'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
