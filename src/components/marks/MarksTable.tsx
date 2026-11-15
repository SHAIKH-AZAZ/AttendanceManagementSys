'use client';

import React, { useRef } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import type { MarkEntry } from '@/types';
import { Badge } from '@/components/ui';

/**
 * Marks for one assessment. Editable for the class teacher (Enter moves to the
 * next student), read-only for review. Marks above the maximum are flagged.
 */
export function MarksTable({
  entries,
  maxMarks,
  editable,
  onChange,
}: {
  entries: MarkEntry[];
  maxMarks: number;
  editable: boolean;
  onChange?: (studentId: string, patch: Partial<MarkEntry>) => void;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ pl: 2.5 }}>Roll no.</TableCell>
            <TableCell>Student</TableCell>
            <TableCell sx={{ width: 150 }}>Marks / {maxMarks}</TableCell>
            <TableCell align="center" sx={{ width: 90 }}>Absent</TableCell>
            <TableCell sx={{ pr: 2.5 }}>Remark</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((e, i) => {
            const over = e.marks !== null && e.marks > maxMarks;
            return (
              <TableRow key={e.studentId} hover sx={e.absent ? { bgcolor: 'rgba(253,236,231,.4)' } : undefined}>
                <TableCell sx={{ pl: 2.5, fontFamily: 'monospace', fontSize: 12, color: 'text.secondary' }}>{e.enrollmentNumber}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{e.studentName}</TableCell>
                <TableCell>
                  {editable ? (
                    <TextField
                      type="number"
                      value={e.absent || e.marks === null ? '' : e.marks}
                      disabled={e.absent}
                      error={over}
                      placeholder={e.absent ? 'AB' : '—'}
                      inputRef={(el) => {
                        inputs.current[i] = el;
                      }}
                      onChange={(ev) => onChange?.(e.studentId, { marks: ev.target.value === '' ? null : Number(ev.target.value) })}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter') {
                          ev.preventDefault();
                          inputs.current.slice(i + 1).find((el) => el && !el.disabled)?.focus();
                        }
                      }}
                      slotProps={{ htmlInput: { min: 0, max: maxMarks, step: 0.5, 'aria-label': `Marks for ${e.studentName}`, style: { paddingBlock: 6 } } }}
                    />
                  ) : e.absent ? (
                    <Badge tone="bad">Absent</Badge>
                  ) : (
                    <span className="font-semibold">{e.marks ?? '—'}</span>
                  )}
                </TableCell>
                <TableCell align="center">
                  {editable ? (
                    <Checkbox
                      size="small"
                      checked={e.absent}
                      onChange={(ev) => onChange?.(e.studentId, { absent: ev.target.checked, marks: null })}
                      slotProps={{ input: { 'aria-label': `${e.studentName} absent` } }}
                    />
                  ) : e.absent ? (
                    'AB'
                  ) : (
                    ''
                  )}
                </TableCell>
                <TableCell sx={{ pr: 2.5 }}>
                  {editable ? (
                    <TextField
                      value={e.remark ?? ''}
                      onChange={(ev) => onChange?.(e.studentId, { remark: ev.target.value })}
                      placeholder="Optional"
                      slotProps={{ htmlInput: { maxLength: 120, 'aria-label': `Remark for ${e.studentName}`, style: { paddingBlock: 6 } } }}
                    />
                  ) : (
                    <span className="text-slate-500">{e.remark || ''}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function MarksStats({ stats, maxMarks }: { stats: { students: number; entered: number; absent: number; pending: number; average: number | null; highest: number | null; lowest: number | null }; maxMarks: number }) {
  const items: [string, React.ReactNode][] = [
    ['Entered', `${stats.entered} / ${stats.students}`],
    ['Absent', stats.absent],
    ['Average', stats.average === null ? '—' : `${stats.average} / ${maxMarks}`],
    ['Highest', stats.highest ?? '—'],
    ['Lowest', stats.lowest ?? '—'],
  ];
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {items.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-2xs text-slate-500">{k}</dt>
          <dd className="text-base font-bold text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Live statistics from entries being edited (same shape as the server's). */
export function liveStats(entries: MarkEntry[]) {
  const scored = entries.filter((e) => !e.absent && e.marks !== null).map((e) => e.marks as number);
  const absent = entries.filter((e) => e.absent).length;
  const avg = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;
  return {
    students: entries.length,
    entered: scored.length,
    absent,
    pending: entries.length - scored.length - absent,
    average: avg === null ? null : Math.round(avg * 100) / 100,
    highest: scored.length ? Math.max(...scored) : null,
    lowest: scored.length ? Math.min(...scored) : null,
  };
}

export const ASSESSMENT_STATUS = {
  DRAFT: { label: 'Draft', tone: 'warn' as const },
  SUBMITTED: { label: 'With HOD', tone: 'info' as const },
  PUBLISHED: { label: 'Published', tone: 'good' as const },
};
