'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import type { Assessment } from '@/types';
import { Badge, Button, Card, EmptyState, Modal, type NoticeTone, PageHeader, SegmentedControl, formatDate } from '@/components/ui';
import { ASSESSMENT_STATUS, MarksStats, MarksTable, liveStats } from '@/components/marks/MarksTable';
import { ArrowLeft, Check, CheckCircle2, ClipboardList, Undo2 } from 'lucide-react';

type Row = Assessment & { stats: ReturnType<typeof liveStats> };

/** HOD: approve submitted marks (students then see them) or return them to the teacher. */
export function MarksReviewTab({
  classLabel,
  notify,
}: {
  classLabel: (id: string) => string;
  notify: (n: { tone: NoticeTone; text: string }) => void;
}) {
  const [filter, setFilter] = useState<'SUBMITTED' | 'PUBLISHED'>('SUBMITTED');
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState({ SUBMITTED: 0, PUBLISHED: 0 });
  const [open, setOpen] = useState<Row | null>(null);
  const [returning, setReturning] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/assessments');
    if (!res.ok) return;
    const all: Row[] = (await res.json()).assessments ?? [];
    setCounts({ SUBMITTED: all.filter((a) => a.status === 'SUBMITTED').length, PUBLISHED: all.filter((a) => a.status === 'PUBLISHED').length });
    setRows(all.filter((a) => a.status === filter));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (decision: 'APPROVE' | 'RETURN') => {
    if (!open) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/assessments/${open.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comment }),
      });
      const data = await res.json();
      if (!res.ok) return notify({ tone: 'error', text: data.error || 'Could not save the decision.' });
      notify({
        tone: 'success',
        text: decision === 'APPROVE' ? `${open.title} published to students.` : `${open.title} returned to the teacher.`,
      });
      setReturning(false);
      setOpen(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  if (open) {
    return (
      <>
        <PageHeader
          back={<Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => setOpen(null)}>All marks</Button>}
          title={open.title}
          description={`${open.component} · ${formatDate(open.date)} · ${classLabel(open.sectionId)} · out of ${open.maxMarks}`}
          actions={
            open.status === 'SUBMITTED' ? (
              <>
                <Button variant="danger" icon={Undo2} onClick={() => { setComment(''); setReturning(true); }}>Return</Button>
                <Button variant="primary" icon={Check} loading={busy} onClick={() => review('APPROVE')}>Approve and publish</Button>
              </>
            ) : (
              <Badge tone={ASSESSMENT_STATUS[open.status].tone}>{ASSESSMENT_STATUS[open.status].label}</Badge>
            )
          }
        />
        <div className="mb-4">
          <MarksStats stats={open.stats} maxMarks={open.maxMarks} />
        </div>
        <Card padded={false}>
          <MarksTable entries={open.entries} maxMarks={open.maxMarks} editable={false} />
        </Card>
        <Modal
          open={returning}
          onClose={() => setReturning(false)}
          icon={Undo2}
          title="Return marks to the teacher"
          description="They can edit and resubmit. Students don't see anything until you approve."
          footer={
            <>
              <Button variant="ghost" onClick={() => setReturning(false)}>Cancel</Button>
              <Button variant="danger" loading={busy} disabled={!comment.trim()} onClick={() => review('RETURN')}>Return</Button>
            </>
          }
        >
          <TextField id="return-comment" label="What needs to change" required multiline minRows={3} value={comment} onChange={(e) => setComment(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
        </Modal>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Marks review"
        description="Teachers submit marks here before students can see them."
        actions={
          <SegmentedControl
            label="Marks status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'SUBMITTED', label: 'To review', count: counts.SUBMITTED },
              { value: 'PUBLISHED', label: 'Published', count: counts.PUBLISHED },
            ]}
          />
        }
      />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={filter === 'SUBMITTED' ? CheckCircle2 : ClipboardList}
            title={filter === 'SUBMITTED' ? 'Nothing to review' : 'No published marks yet'}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-800">{r.title}</h3>
                  <p className="text-sm text-slate-500">{classLabel(r.sectionId)}</p>
                </div>
                <Badge tone={ASSESSMENT_STATUS[r.status].tone}>{ASSESSMENT_STATUS[r.status].label}</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {r.component} · {formatDate(r.date)} · out of {r.maxMarks}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Average <strong>{r.stats.average ?? '—'}</strong> · highest {r.stats.highest ?? '—'} · {r.stats.absent} absent
              </p>
              <Button className="mt-4" variant={r.status === 'SUBMITTED' ? 'primary' : 'secondary'} onClick={() => setOpen(r)}>
                {r.status === 'SUBMITTED' ? 'Review' : 'View'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
