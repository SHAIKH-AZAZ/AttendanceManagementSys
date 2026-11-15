'use client';

import React, { useCallback, useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { MetaSection } from '@/hooks/useMeta';
import type { Assessment, MarkEntry } from '@/types';
import { ASSESSMENT_COMPONENTS, MARKS_NEED_HOD_APPROVAL, todayIST } from '@/lib/rules';
import { Badge, Button, Card, DateInput, EmptyState, Modal, Notice, type NoticeTone, PageHeader, SelectField, formatDate } from '@/components/ui';
import { ASSESSMENT_STATUS, MarksStats, MarksTable, liveStats } from '@/components/marks/MarksTable';
import { ArrowLeft, ClipboardList, Plus, Save, Send, Trash2 } from 'lucide-react';

type Stats = ReturnType<typeof liveStats>;
type Row = Assessment & { stats: Stats };

export function MarksTab({
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
  const [open, setOpen] = useState<Row | null>(null);
  const [entries, setEntries] = useState<MarkEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [form, setForm] = useState({ title: '', component: ASSESSMENT_COMPONENTS[0], date: todayIST(), maxMarks: '30' });

  const load = useCallback(async () => {
    if (!sectionId) return;
    const res = await fetch(`/api/assessments?sectionId=${sectionId}`);
    if (res.ok) setRows((await res.json()).assessments ?? []);
  }, [sectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const openRow = (r: Row) => {
    setOpen(r);
    setEntries(structuredClone(r.entries));
    setDirty(false);
    setError(null);
  };

  const call = async (url: string, init: RequestInit) => {
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
    const data = await call('/api/assessments', {
      method: 'POST',
      body: JSON.stringify({ sectionId, ...form, maxMarks: Number(form.maxMarks) }),
    });
    if (!data) return;
    setCreateOpen(false);
    await load();
    openRow({ ...data.assessment, stats: liveStats(data.assessment.entries) });
  };

  const save = async () => {
    if (!open) return null;
    const data = await call(`/api/assessments/${open.id}`, { method: 'PUT', body: JSON.stringify({ entries }) });
    if (data) {
      setDirty(false);
      setOpen(data.assessment);
      load();
    }
    return data;
  };

  const submit = async () => {
    if (!open) return;
    if (dirty && !(await save())) return;
    const data = await call(`/api/assessments/${open.id}/submit`, { method: 'POST' });
    setConfirmSubmit(false);
    if (!data) return;
    notify({
      tone: 'success',
      text: data.assessment.status === 'PUBLISHED' ? 'Marks published to students.' : 'Marks sent to your HOD for approval.',
    });
    setOpen(null);
    load();
  };

  const remove = async () => {
    if (!open) return;
    if (await call(`/api/assessments/${open.id}`, { method: 'DELETE' })) {
      notify({ tone: 'success', text: 'Draft deleted.' });
      setOpen(null);
      load();
    }
  };

  if (!sections.length) return null;

  /* ---------------------------------------------------------------- Editor */
  if (open) {
    const editable = open.status === 'DRAFT';
    const st = editable ? liveStats(entries) : open.stats;
    const status = ASSESSMENT_STATUS[open.status];
    return (
      <>
        <PageHeader
          back={
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => (dirty ? setConfirmLeave(true) : setOpen(null))}>
              All assessments
            </Button>
          }
          title={open.title}
          description={`${open.component} · ${formatDate(open.date)} · ${classLabel(open.sectionId)} · out of ${open.maxMarks}`}
          actions={
            editable ? (
              <>
                <Button variant="danger" icon={Trash2} onClick={remove} disabled={busy}>Delete</Button>
                <Button icon={Save} loading={busy} disabled={!dirty} onClick={save}>Save</Button>
                <Button variant="primary" icon={Send} disabled={busy || st.pending > 0} onClick={() => setConfirmSubmit(true)}>
                  {MARKS_NEED_HOD_APPROVAL ? 'Submit to HOD' : 'Publish'}
                </Button>
              </>
            ) : (
              <Badge tone={status.tone}>{status.label}</Badge>
            )
          }
        />
        {open.reviewComment && editable && (
          <Notice tone="warn" className="mb-4">
            <strong>Returned by HOD:</strong> {open.reviewComment}
          </Notice>
        )}
        {!editable && (
          <Notice tone="info" className="mb-4">
            {open.status === 'SUBMITTED'
              ? 'Waiting for your HOD. Marks can be changed again only if the HOD returns them.'
              : 'Published to students. Published marks are locked.'}
          </Notice>
        )}
        {error && <Notice tone="error" className="mb-4">{error}</Notice>}
        <div className="mb-4">
          <MarksStats stats={st} maxMarks={open.maxMarks} />
          {editable && st.pending > 0 && (
            <p className="mt-2 text-xs text-slate-500">{st.pending} students still need marks or “absent” before you can submit.</p>
          )}
        </div>
        <Card padded={false}>
          <MarksTable
            entries={editable ? entries : open.entries}
            maxMarks={open.maxMarks}
            editable={editable}
            onChange={(id, patch) => {
              setEntries((prev) => prev.map((e) => (e.studentId === id ? { ...e, ...patch } : e)));
              setDirty(true);
            }}
          />
        </Card>
        <Modal
          open={confirmSubmit}
          onClose={() => setConfirmSubmit(false)}
          icon={Send}
          title={MARKS_NEED_HOD_APPROVAL ? 'Submit marks to your HOD?' : 'Publish marks to students?'}
          description={
            MARKS_NEED_HOD_APPROVAL
              ? 'You can’t edit them while the HOD reviews. Students see them only after approval.'
              : 'Students will see their marks immediately. Published marks are locked.'
          }
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmSubmit(false)}>Keep editing</Button>
              <Button variant="primary" icon={Send} loading={busy} onClick={submit}>
                {MARKS_NEED_HOD_APPROVAL ? 'Submit' : 'Publish'}
              </Button>
            </>
          }
        >
          <MarksStats stats={st} maxMarks={open.maxMarks} />
        </Modal>
        <Modal
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title="Discard unsaved marks?"
          description="You have marks that aren't saved yet."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmLeave(false)}>Keep editing</Button>
              <Button
                variant="danger"
                onClick={() => {
                  setConfirmLeave(false);
                  setDirty(false);
                  setOpen(null);
                }}
              >
                Discard
              </Button>
            </>
          }
        />
      </>
    );
  }

  /* ------------------------------------------------------------------ List */
  return (
    <>
      <PageHeader
        title="Marks"
        description={`Create a test or viva for a class, enter marks, then ${MARKS_NEED_HOD_APPROVAL ? 'submit them to your HOD' : 'publish them'}.`}
        actions={
          <>
            <SelectField
              label="Subject · class" fullWidth={false}
              value={sectionId}
              onChange={(v) => {
                setSectionId(v);
                setOpen(null);
              }}
              minWidth={320}
              options={sections.map((s) => ({ value: s.id, label: classLabel(s.id) }))}
            />
            <Button variant="primary" icon={Plus} onClick={() => {
              setForm({ title: '', component: ASSESSMENT_COMPONENTS[0], date: todayIST(), maxMarks: '30' });
              setError(null);
              setCreateOpen(true);
            }}>
              New assessment
            </Button>
          </>
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No assessments yet" description="Create one for a mid-semester exam, unit test, viva or practical." />
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Assessment</TableCell>
                  <TableCell align="center">Out of</TableCell>
                  <TableCell>Average</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const s = ASSESSMENT_STATUS[r.status];
                  const returned = r.status === 'DRAFT' && r.reviewComment;
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell className="whitespace-nowrap text-slate-600">{formatDate(r.date)}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-800">{r.title}</div>
                        <div className="text-xs text-slate-500">{r.component}</div>
                      </TableCell>
                      <TableCell align="center">{r.maxMarks}</TableCell>
                      <TableCell className="text-slate-600">
                        {r.stats.average ?? '—'} <span className="text-slate-400">· {r.stats.entered}/{r.stats.students} marked</span>
                      </TableCell>
                      <TableCell>{returned ? <Badge tone="bad">Returned</Badge> : <Badge tone={s.tone}>{s.label}</Badge>}</TableCell>
                      <TableCell align="right">
                        <Button size="sm" variant={r.status === 'DRAFT' ? 'primary' : 'ghost'} onClick={() => openRow(r)}>
                          {r.status === 'DRAFT' ? 'Enter marks' : 'View'}
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
        icon={ClipboardList}
        title="New assessment"
        description={classLabel(sectionId)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="new-assessment" loading={busy}>Create and enter marks</Button>
          </>
        }
      >
        <form id="new-assessment" onSubmit={create} className="grid grid-cols-2 gap-4 pt-1">
          <div className="col-span-2">
            <TextField id="asmt-title" label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mid-semester exam 1" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 80 } }} />
          </div>
          <SelectField id="asmt-type" label="Type" value={form.component} onChange={(v) => setForm({ ...form, component: v })} options={ASSESSMENT_COMPONENTS.map((c) => ({ value: c, label: c }))} />
          <TextField id="asmt-max" label="Out of" type="number" required value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} slotProps={{ htmlInput: { min: 1, max: 1000 } }} />
          <div className="col-span-2">
            <DateInput id="asmt-date" label="Date" required value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>
          {error && <p className="col-span-2 text-sm text-rose-600">{error}</p>}
        </form>
      </Modal>
    </>
  );
}
