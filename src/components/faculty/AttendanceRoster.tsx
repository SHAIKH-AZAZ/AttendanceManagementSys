'use client';

import React, { useMemo, useState } from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import { CheckCircle2, Copy, MessageSquareText, MoreVertical, Search, UserX, Users, XCircle } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '@/types';
import { TOKENS } from '@/theme';
import {
  ATTENDANCE_ORDER,
  ATTENDANCE_STATUS,
  Button,
  EmptyState,
  Modal,
  SearchField,
  SegmentedControl,
  StatusBadge,
} from '@/components/ui';

type Filter = 'ALL' | 'ABSENT' | 'PRESENT' | 'OTHER';

/** Keys a focused student card answers to: P, A, L, E, M, O. */
const KEY_TO_STATUS = Object.fromEntries(ATTENDANCE_ORDER.map((k) => [ATTENDANCE_STATUS[k].short.toLowerCase(), k])) as Record<
  string,
  AttendanceStatus
>;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

/** Tapping a card: present ⇄ absent; any other status goes back to present. */
const nextStatus = (s: AttendanceStatus): AttendanceStatus => (s === 'PRESENT' ? 'ABSENT' : 'PRESENT');

/**
 * Match quick-entry tokens to students. A number matches the trailing digits of
 * the roll number numerically ("7" → …-007, never …-017); anything else must equal
 * a whole roll number. A token that matches nobody, or more than one student, marks nobody.
 */
export function matchRollTokens(input: string, records: AttendanceRecord[]) {
  const matched = new Set<string>();
  const unknown: string[] = [];
  const ambiguous: string[] = [];
  for (const token of input.split(/[\s,;]+/).filter(Boolean)) {
    const hits = /^\d+$/.test(token)
      ? records.filter((r) => Number(/(\d+)$/.exec(r.enrollmentNumber)?.[1] ?? NaN) === Number(token))
      : records.filter((r) => r.enrollmentNumber.toLowerCase() === token.toLowerCase());
    if (hits.length === 1) matched.add(hits[0].studentId);
    else (hits.length === 0 ? unknown : ambiguous).push(token);
  }
  return { ids: [...matched], unknown, ambiguous };
}

interface Props {
  records: AttendanceRecord[];
  locked: boolean;
  busy: boolean;
  onStatus: (studentId: string, status: AttendanceStatus) => void;
  onRemark: (studentId: string, remarks: string) => void;
  /** Bulk changes; the portal keeps a one-step undo for these. */
  onMarkMany: (studentIds: string[], status: AttendanceStatus, message: string) => void;
  onMarkAll: (status: AttendanceStatus) => void;
  onCopyPrevious: () => void;
}

export function AttendanceRoster({ records, locked, busy, onStatus, onRemark, onMarkMany, onMarkAll, onCopyPrevious }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [quick, setQuick] = useState('');
  const [quickResult, setQuickResult] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; record: AttendanceRecord } | null>(null);
  const [remarkFor, setRemarkFor] = useState<AttendanceRecord | null>(null);
  const [remarkText, setRemarkText] = useState('');

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, OTHER: 0 };
    records.forEach((r) => (r.status === 'PRESENT' || r.status === 'ABSENT' ? c[r.status]++ : c.OTHER++));
    return c;
  }, [records]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(
      (r) =>
        (filter === 'ALL' ||
          (filter === 'OTHER' ? r.status !== 'PRESENT' && r.status !== 'ABSENT' : r.status === filter)) &&
        (!q || r.studentName.toLowerCase().includes(q) || r.enrollmentNumber.toLowerCase().includes(q))
    );
  }, [records, search, filter]);

  const submitQuick = (e: React.FormEvent) => {
    e.preventDefault();
    const { ids, unknown, ambiguous } = matchRollTokens(quick, records);
    // Success is announced by the action bar (with Undo); this line reports only problems.
    const problems = [];
    if (unknown.length) problems.push(`No student with roll ${unknown.join(', ')}`);
    if (ambiguous.length) problems.push(`${ambiguous.join(', ')} matches more than one student; type the full roll number`);
    setQuickResult(problems.length ? `${problems.join('. ')}.` : ids.length ? null : 'Type one or more roll numbers first.');
    if (ids.length) {
      onMarkMany(ids, 'ABSENT', `Marked ${ids.length} absent by roll number.`);
      setQuick(unknown.concat(ambiguous).join(', '));
    }
  };

  const openRemark = (r: AttendanceRecord) => {
    setRemarkFor(r);
    setRemarkText(r.remarks ?? '');
  };

  const filterOptions: { value: Filter; label: string; count?: number }[] = [
    { value: 'ALL', label: 'All', count: records.length },
    { value: 'ABSENT', label: 'Absent', count: counts.ABSENT },
    { value: 'PRESENT', label: 'Present', count: counts.PRESENT },
    ...(counts.OTHER || filter === 'OTHER' ? [{ value: 'OTHER' as const, label: 'Other', count: counts.OTHER }] : []),
  ];

  return (
    <>
      {/* Tools */}
      <div className="px-5 pb-4 flex flex-col gap-3">
        {!locked && (
          <form onSubmit={submitQuick} className="flex flex-wrap items-start gap-2" aria-describedby="quick-hint">
            <TextField
              id="quick-absent"
              label="Mark absent by roll number"
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder="e.g. 3, 7, 12"
              autoComplete="off"
              sx={{ flex: 1, minWidth: 220 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'text', enterKeyHint: 'done' } }}
            />
            <Button type="submit" variant="danger" icon={UserX}>
              Mark absent
            </Button>
            <p id="quick-hint" className="basis-full text-2xs text-slate-500">
              Everyone starts present. Type the last digits of each absentee&apos;s roll number, or tap their card below.
            </p>
            <output className="basis-full text-xs text-slate-600 empty:hidden">{quickResult}</output>
          </form>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl label="Show" value={filter} onChange={setFilter} options={filterOptions} />
          <SearchField value={search} onChange={setSearch} placeholder="Find a student" ariaLabel="Find a student by name or roll number" />
          {!locked && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={CheckCircle2} onClick={() => onMarkAll('PRESENT')}>
                All present
              </Button>
              <Button size="sm" icon={XCircle} onClick={() => onMarkAll('ABSENT')}>
                All absent
              </Button>
              <Button size="sm" icon={Copy} disabled={busy} onClick={onCopyPrevious}>
                Copy last lecture
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Roster */}
      {records.length === 0 ? (
        <EmptyState icon={Users} title="No students on this lecture" description="This class had no enrolled students when the lecture was created." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title={filter === 'ABSENT' && !search ? 'Nobody is absent' : 'No students match'}
          description={filter === 'ABSENT' && !search ? 'Everyone on this lecture is marked present or excused.' : 'Clear the search or pick another filter.'}
        />
      ) : (
        <ul
          aria-label="Students"
          className="grid gap-2 px-5 pb-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,17rem),1fr))]"
        >
          {visible.map((r) => {
            const s = ATTENDANCE_STATUS[r.status];
            const isAbsent = r.status === 'ABSENT';
            const isPresent = r.status === 'PRESENT';
            const avatar = (
              <span
                aria-hidden
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                style={
                  isPresent
                    ? { background: TOKENS.goodTint, color: TOKENS.goodInk }
                    : { background: s.color, color: '#fff' }
                }
              >
                {isPresent ? initials(r.studentName) : s.short}
              </span>
            );
            const body = (
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-semibold text-slate-800 truncate">{r.studentName}</span>
                <span className="block font-mono text-2xs text-slate-500">
                  {r.enrollmentNumber}
                  {/* Phones: status as text here, so the name keeps the row's width */}
                  <span className="sm:hidden font-sans font-semibold" style={{ color: isPresent ? TOKENS.goodInk : s.color }}>
                    {' '}· {s.label}
                  </span>
                </span>
                {r.remarks && <span className="block text-2xs text-slate-600 italic truncate">“{r.remarks}”</span>}
              </span>
            );
            return (
              <li
                key={r.studentId}
                className="flex items-stretch rounded-xl border bg-white transition-colors"
                style={{
                  borderColor: isPresent ? TOKENS.rule : s.color,
                  background: isAbsent ? TOKENS.badTint : isPresent ? '#fff' : undefined,
                }}
              >
                {locked ? (
                  <div className="flex flex-1 items-center gap-3 p-3 min-w-0">
                    {avatar}
                    {body}
                    <span className="hidden sm:inline-flex">
                      <StatusBadge status={r.status} />
                    </span>
                  </div>
                ) : (
                  <>
                    <ButtonBase
                      onClick={() => onStatus(r.studentId, nextStatus(r.status))}
                      onKeyDown={(e) => {
                        const k = KEY_TO_STATUS[e.key.toLowerCase()];
                        if (k && !e.ctrlKey && !e.metaKey && !e.altKey) {
                          e.preventDefault();
                          onStatus(r.studentId, k);
                        }
                      }}
                      aria-label={`${r.studentName}, ${r.enrollmentNumber}, ${s.label}. Activate to mark ${ATTENDANCE_STATUS[nextStatus(r.status)].label.toLowerCase()}.`}
                      aria-keyshortcuts="P A L E M O"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        justifyContent: 'flex-start',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: '12px 0 0 12px',
                        transition: 'background-color 120ms ease-out, scale 120ms ease-out',
                        '&:hover': { bgcolor: isAbsent ? 'rgba(194,65,12,.06)' : TOKENS.fill },
                        '&:active': { scale: '0.98' },
                        '&.Mui-focusVisible': { outline: `2px solid ${TOKENS.accent}`, outlineOffset: -2 },
                        '@media (prefers-reduced-motion: reduce)': { '&:active': { scale: 'none' } },
                      }}
                    >
                      {avatar}
                      {body}
                      <span className="hidden sm:inline-flex">
                        <StatusBadge status={r.status} />
                      </span>
                    </ButtonBase>
                    <IconButton
                      aria-label={`More marks for ${r.studentName}`}
                      aria-haspopup="menu"
                      onClick={(e) => setMenu({ anchor: e.currentTarget, record: r })}
                      sx={{ borderRadius: '0 12px 12px 0', px: 1, color: 'text.secondary' }}
                    >
                      <MoreVertical size={18} />
                    </IconButton>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!locked && records.length > 0 && (
        <p className="hidden sm:block px-5 pb-4 -mt-2 text-2xs text-slate-500">
          Keyboard: Tab to a student, then press P, A, L, E, M or O (present, absent, late, excused, medical, on duty).
        </p>
      )}

      {/* Rare statuses and remarks for one student */}
      <Menu
        anchorEl={menu?.anchor}
        open={!!menu}
        onClose={() => setMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menu &&
          ATTENDANCE_ORDER.map((k) => (
            <MenuItem
              key={k}
              selected={menu.record.status === k}
              onClick={() => {
                onStatus(menu.record.studentId, k);
                setMenu(null);
              }}
            >
              <ListItemIcon>
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-2xs font-bold text-white" style={{ background: ATTENDANCE_STATUS[k].color }}>
                  {ATTENDANCE_STATUS[k].short}
                </span>
              </ListItemIcon>
              <ListItemText primary={ATTENDANCE_STATUS[k].label} />
            </MenuItem>
          ))}
        <Divider />
        <MenuItem
          onClick={() => {
            if (menu) openRemark(menu.record);
            setMenu(null);
          }}
        >
          <ListItemIcon>
            <MessageSquareText size={16} />
          </ListItemIcon>
          <ListItemText primary={menu?.record.remarks ? 'Edit remark' : 'Add remark'} />
        </MenuItem>
      </Menu>

      <Modal
        open={!!remarkFor}
        onClose={() => setRemarkFor(null)}
        icon={MessageSquareText}
        title={`Remark for ${remarkFor?.studentName ?? ''}`}
        description="Optional. The student sees it in their lecture history."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemarkFor(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (remarkFor) onRemark(remarkFor.studentId, remarkText.trim());
                setRemarkFor(null);
              }}
            >
              Save remark
            </Button>
          </>
        }
      >
        <TextField
          label="Remark"
          value={remarkText}
          onChange={(e) => setRemarkText(e.target.value)}
          multiline
          minRows={2}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 200 } }}
          helperText={`${remarkText.length}/200`}
        />
      </Modal>
    </>
  );
}
