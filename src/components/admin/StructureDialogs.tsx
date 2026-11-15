'use client';

import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import type { Meta } from '@/hooks/useMeta';
import { Button, Modal, SelectField } from '@/components/ui';
import { BookPlus, LayoutGrid } from 'lucide-react';

type Done = (message: string) => void;

async function post(url: string, body: object) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not save.');
  return data;
}

/** Add a subject (code as printed on the timetable, e.g. BE05000171). */
export function AddSubjectDialog({ open, onClose, meta, onDone }: { open: boolean; onClose: () => void; meta: Meta; onDone: Done }) {
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState('4');
  const [departmentId, setDepartmentId] = useState(meta.departments[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/api/admin/courses', { code, title, credits: Number(credits), departmentId });
      onDone(`Subject ${code.toUpperCase()} added.`);
      setCode('');
      setTitle('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={BookPlus}
      title="Add subject"
      description="Use the code and name as printed on the timetable or syllabus."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-subject" loading={busy}>Add subject</Button>
        </>
      }
    >
      <form id="add-subject" onSubmit={submit} className="flex flex-col gap-4 pt-1">
        <TextField id="subj-code" label="Subject code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="BE05000171" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 30 } }} />
        <TextField id="subj-title" label="Subject name" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Computer Networks" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 120 } }} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="subj-credits" label="Credits" type="number" value={credits} onChange={(e) => setCredits(e.target.value)} slotProps={{ htmlInput: { min: 0, max: 12 } }} />
          <SelectField id="subj-dept" label="Department" value={departmentId} onChange={setDepartmentId} options={meta.departments.map((d) => ({ value: d.id, label: d.name }))} />
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

/** Add a class: one subject taught to a division (theory), a batch (lab), or several divisions together. */
export function AddClassDialog({ open, onClose, meta, onDone }: { open: boolean; onClose: () => void; meta: Meta; onDone: Done }) {
  const [courseId, setCourseId] = useState(meta.courses[0]?.id ?? '');
  const [kind, setKind] = useState<'THEORY' | 'LAB'>('THEORY');
  const [divisions, setDivisions] = useState('');
  const [batch, setBatch] = useState('');
  const [periods, setPeriods] = useState('1');
  const [name, setName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = meta.courses.find((c) => c.id === courseId);
  const teachers = meta.faculty.filter((f) => f.departmentId === course?.departmentId);
  const divList = divisions.split(/[,+\s]+/).map((d) => d.trim().toUpperCase()).filter(Boolean);
  const suggestedName = kind === 'LAB' ? `${divList[0] ?? ''} lab batch ${batch.toUpperCase()}`.trim() : divList.join(' + ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post('/api/admin/sections', {
        courseId,
        kind,
        divisions: divList,
        batch: kind === 'LAB' ? batch : undefined,
        defaultPeriods: Number(periods),
        name: name.trim() || suggestedName,
        facultyId: facultyId || teachers[0]?.id,
      });
      onDone(`Class ${name.trim() || suggestedName} added. Import its students under Bulk import.`);
      setDivisions('');
      setBatch('');
      setName('');
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={LayoutGrid}
      title="Add class"
      description="A class is one subject taught to one group: a division for theory, a batch for a lab, or two divisions together."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-class" loading={busy} disabled={!courseId || !divList.length}>
            Add class
          </Button>
        </>
      }
    >
      <form id="add-class" onSubmit={submit} className="grid sm:grid-cols-2 gap-4 pt-1">
        <SelectField
          id="class-subject"
          label="Subject"
          value={courseId}
          onChange={(v) => {
            setCourseId(v);
            setFacultyId('');
          }}
          options={meta.courses.map((c) => ({ value: c.id, label: `${c.code} · ${c.title}` }))}
        />
        <SelectField<'THEORY' | 'LAB'>
          id="class-kind"
          label="Type"
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPeriods(v === 'LAB' ? '2' : '1');
          }}
          options={[
            { value: 'THEORY', label: 'Theory (whole division)' },
            { value: 'LAB', label: 'Lab (one batch)' },
          ]}
        />
        <TextField
          id="class-divisions"
          label="Division(s)"
          required
          value={divisions}
          onChange={(e) => setDivisions(e.target.value)}
          placeholder="5CEA  or  5CEA, 5CEB"
          helperText="Two divisions for a combined class"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {kind === 'LAB' ? (
          <TextField id="class-batch" label="Batch" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="A1" slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 8 } }} />
        ) : (
          <div className="hidden sm:block" />
        )}
        <SelectField
          id="class-periods"
          label="Periods per lecture"
          value={periods}
          onChange={setPeriods}
          options={[
            { value: '1', label: '1 period' },
            { value: '2', label: '2 periods' },
            { value: '3', label: '3 periods' },
          ]}
        />
        <SelectField
          id="class-teacher"
          label="Teacher"
          value={facultyId || teachers[0]?.id || ''}
          onChange={setFacultyId}
          options={teachers.length ? teachers.map((f) => ({ value: f.id, label: f.fullName })) : [{ value: '', label: 'No teachers in this department' }]}
        />
        <div className="sm:col-span-2">
          <TextField
            id="class-name"
            label="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={suggestedName || '5CEA'}
            helperText="Leave empty to use the suggestion"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 80 } }}
          />
        </div>
        {error && <p className="sm:col-span-2 text-sm text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}
