'use client';

/**
 * AttendEASE365 UI kit, built on Material UI. Portals import from here only,
 * so swapping internals never touches the screens.
 */
import React, { useState } from 'react';
import MuiButton from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import { useTheme } from '@mui/material/styles';
import { Info, Search, X } from 'lucide-react';
import { TOKENS } from '@/theme';
import type { AttendanceStatus, LeaveStatus, LeaveType } from '@/types';

/* ------------------------------------------------------------------ Tones */

export type Tone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'sky';

/** Soft background, text and border colours per tone (chips, tiles). */
export const TONES: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: TOKENS.fill, fg: '#3B4860', border: TOKENS.rule },
  accent: { bg: TOKENS.accentTint, fg: TOKENS.accentInk, border: '#C7D7FE' },
  good: { bg: TOKENS.goodTint, fg: TOKENS.goodInk, border: '#C6F0B3' },
  bad: { bg: TOKENS.badTint, fg: TOKENS.badInk, border: '#F6BBA6' },
  warn: { bg: TOKENS.warnTint, fg: '#92400E', border: '#FDE68A' },
  info: { bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' },
  violet: { bg: TOKENS.violetTint, fg: '#6D28D9', border: '#DDD6FE' },
  sky: { bg: TOKENS.skyTint, fg: TOKENS.sky, border: '#BAE6FD' },
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: TOKENS.ink,
  accent: TOKENS.accentInk,
  good: TOKENS.goodInk,
  bad: TOKENS.bad,
  warn: '#B45309',
  info: '#1D4ED8',
  violet: '#6D28D9',
  sky: TOKENS.sky,
};

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: React.ElementType;
  loading?: boolean;
}

const VARIANT_PROPS: Record<ButtonVariant, { variant: 'contained' | 'outlined' | 'text'; color: 'primary' | 'inherit' | 'error' | 'success' }> = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'inherit' },
  ghost: { variant: 'text', color: 'inherit' },
  danger: { variant: 'outlined', color: 'error' },
  success: { variant: 'outlined', color: 'success' },
};

export function Button({ variant = 'secondary', size = 'md', icon: Icon, loading, children, type = 'button', ...rest }: ButtonProps) {
  const v = VARIANT_PROPS[variant];
  const iconSize = size === 'md' ? 16 : 14;
  return (
    <MuiButton
      {...v}
      type={type}
      size={size === 'md' ? 'medium' : 'small'}
      loading={loading}
      loadingPosition={Icon ? 'start' : 'center'}
      startIcon={Icon ? <Icon size={iconSize} /> : undefined}
      sx={variant === 'secondary' ? { borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' } : undefined}
      {...(rest as object)}
    >
      {children}
    </MuiButton>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({ className, children, padded = true }: { className?: string; children: React.ReactNode; padded?: boolean }) {
  return (
    <MuiCard className={className} sx={{ p: padded ? 2.5 : 0, overflow: 'visible' }}>
      {children}
    </MuiCard>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <Stack direction="row" className={className} sx={{ gap: 1.5, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h3" component="h3">
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/* -------------------------------------------------------------- PageHeader */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 3 }}>
      {back && <Box sx={{ mb: 1.5 }}>{back}</Box>}
      <Stack direction="row" sx={{ gap: 2, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h1" component="h1">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "42rem" }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

/* ---------------------------------------------------------------- StatCard */

export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: React.ElementType;
  onClick?: () => void;
}) {
  const body = (
    <Box sx={{ p: 2.5, height: '100%', width: '100%' }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {Icon && (
          <Box component="span" sx={{ color: TONE_TEXT[tone === 'neutral' ? 'accent' : tone], display: 'flex' }}>
            <Icon size={16} />
          </Box>
        )}
      </Stack>
      <Typography sx={{ mt: 0.75, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: TONE_TEXT[tone] }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
  return (
    <MuiCard sx={{ height: '100%' }}>
      {onClick ? (
        <CardActionArea onClick={onClick} sx={{ height: '100%', alignItems: 'flex-start', display: 'flex', flexDirection: 'column' }}>
          {body}
        </CardActionArea>
      ) : (
        body
      )}
    </MuiCard>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <Chip
      size="small"
      variant="outlined"
      label={children}
      className={className}
      icon={Icon ? <Icon size={12} /> : undefined}
      sx={{ bgcolor: t.bg, color: t.fg, borderColor: t.border, '& .MuiChip-icon': { color: t.fg, ml: '6px' } }}
    />
  );
}

/* ------------------------------------------------------- Attendance status */

export const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; short: string; tone: Tone; color: string }> = {
  PRESENT: { label: 'Present', short: 'P', tone: 'good', color: TOKENS.good },
  ABSENT: { label: 'Absent', short: 'A', tone: 'bad', color: TOKENS.bad },
  LATE: { label: 'Late', short: 'L', tone: 'warn', color: '#D97706' },
  EXCUSED: { label: 'Excused', short: 'E', tone: 'info', color: '#2563EB' },
  MEDICAL_LEAVE: { label: 'Medical', short: 'M', tone: 'violet', color: TOKENS.violet },
  ON_DUTY: { label: 'On duty', short: 'O', tone: 'sky', color: '#0284C7' },
};

export const ATTENDANCE_ORDER = Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[];

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = ATTENDANCE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/**
 * One-tap attendance picker (P / A / L / E / M / O). The selected button is
 * filled with that status's colour.
 */
export function AttendancePicker({
  value,
  onChange,
  label,
  fullWidth,
}: {
  value: AttendanceStatus;
  onChange: (s: AttendanceStatus) => void;
  label: string;
  fullWidth?: boolean;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v: AttendanceStatus | null) => v && onChange(v)}
      aria-label={label}
      fullWidth={fullWidth}
      sx={{ gap: 0.5, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '6px !important', m: 0 } }}
    >
      {ATTENDANCE_ORDER.map((k) => {
        const s = ATTENDANCE_STATUS[k];
        return (
          <ToggleButton
            key={k}
            value={k}
            aria-label={s.label}
            title={s.label}
            sx={{
              minWidth: 32,
              height: fullWidth ? 40 : 32,
              fontWeight: 700,
              color: 'text.secondary',
              bgcolor: TOKENS.fill,
              '&.Mui-selected, &.Mui-selected:hover': { bgcolor: s.color, color: '#fff' },
            }}
          >
            {s.short}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}

/* ------------------------------------------------------------------ Leave */

export const LEAVE_TYPES: Record<LeaveType, { label: string; hint: string }> = {
  MEDICAL: { label: 'Medical', hint: 'Doctor certificate required' },
  ON_DUTY: { label: 'On duty', hint: 'Event or competition representing the college' },
  CASUAL: { label: 'Casual', hint: 'Personal emergency' },
  BEREAVEMENT: { label: 'Bereavement', hint: 'Loss in the family' },
};

const LEAVE_STATUS_TONE: Record<LeaveStatus, { tone: Tone; label: string }> = {
  PENDING: { tone: 'warn', label: 'Pending' },
  APPROVED: { tone: 'good', label: 'Approved' },
  REJECTED: { tone: 'bad', label: 'Rejected' },
  CANCELLED: { tone: 'neutral', label: 'Cancelled' },
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  const s = LEAVE_STATUS_TONE[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const formatDate = (d: string) =>
  new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon: Icon = Info,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Stack sx={{ py: 6, px: 2, alignItems: "center", textAlign: "center" }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 3,
          bgcolor: TOKENS.accentTint,
          color: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} />
      </Box>
      <Typography variant="h3" component="h3" sx={{ mt: 2 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "28rem" }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Stack>
  );
}

/* ------------------------------------------------------------------ Notice */

const SEVERITY = { success: 'success', error: 'error', warn: 'warning', info: 'info' } as const;
export type NoticeTone = keyof typeof SEVERITY;

export function Notice({
  tone = 'info',
  children,
  onDismiss,
  className,
}: {
  tone?: NoticeTone;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <Alert severity={SEVERITY[tone]} onClose={onDismiss} className={className} variant="standard">
      {children}
    </Alert>
  );
}

/**
 * Notice tied to the tab it was raised on, so a message doesn't follow the user
 * to other sections. `setNotice({ tone, text, tab? })` — tab defaults to the current one.
 */
export function useTabNotice(activeTab: string) {
  const [raw, setRaw] = useState<{ tone: NoticeTone; text: string; tab: string } | null>(null);
  const setNotice = (n: { tone: NoticeTone; text: string; tab?: string } | null) =>
    setRaw(n && { ...n, tab: n.tab ?? activeTab });
  return { notice: raw && raw.tab === activeTab ? raw : null, setNotice };
}

/** "Lecture 3" or "Lecture 3 · Trees", without repeating a title that already starts with "Lecture 3". */
export function lectureName(s: { sessionNumber: number; sessionTitle: string }) {
  const base = `Lecture ${s.sessionNumber}`;
  const t = s.sessionTitle.trim();
  if (!t || t === base) return base;
  if (t.startsWith(base)) return t.replace(new RegExp(`^${base}\\s*[:·-]\\s*`), `${base} · `);
  return `${base} · ${t}`;
}

/* ------------------------------------------------------------------- Modal */

/** Dialog with title, optional icon/description, body and action row. Focus trap, Escape and scroll lock come from MUI. */
export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ElementType;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'md' | 'lg';
}) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={size === 'md' ? 'xs' : 'sm'} fullScreen={phone && size === 'lg'}>
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, pr: 6 }}>
        {Icon && (
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 2,
              bgcolor: TOKENS.accentTint,
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={20} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2" component="h2">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      {children && <DialogContent dividers>{children}</DialogContent>}
      {footer && <DialogActions sx={{ px: 2.5, py: 2, bgcolor: '#F7F9FC', gap: 1 }}>{footer}</DialogActions>}
    </Dialog>
  );
}

/* ------------------------------------------------------------ ProgressBar */

export function ProgressBar({ value, threshold = 75 }: { value: number; threshold?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <Box sx={{ position: "relative" }}>
      <LinearProgress
        variant="determinate"
        value={v}
        color={v < threshold ? 'error' : 'success'}
        aria-label={`${v}% attendance, ${threshold}% required`}
      />
      <Box
        aria-hidden="true"
        sx={{ position: 'absolute', top: -4, height: 16, width: 2, bgcolor: TOKENS.steel, left: `${threshold}%` }}
      />
    </Box>
  );
}

/* -------------------------------------------------------- SegmentedControl */

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, v: T | null) => v && onChange(v)}
      aria-label={label}
      sx={{ bgcolor: TOKENS.fill, p: 0.5, borderRadius: 2, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '6px !important' } }}
    >
      {options.map((o) => (
        <ToggleButton
          key={o.value}
          value={o.value}
          sx={{
            px: 1.5,
            height: 32,
            whiteSpace: 'nowrap',
            color: 'text.secondary',
            '&.Mui-selected, &.Mui-selected:hover': { bgcolor: '#fff', color: 'text.primary', boxShadow: '0 1px 2px rgba(42,53,71,.08)' },
          }}
        >
          {o.label}
          {o.count !== undefined && (
            <Box component="span" sx={{ ml: 0.75, color: TOKENS.steel }}>
              {o.count}
            </Box>
          )}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/* ------------------------------------------------------------------ Fields */

/** Dropdown built on TextField. Without `label` it's an inline filter and needs `ariaLabel`. */
export function SelectField<T extends string>({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  helperText,
  minWidth,
  id,
  fullWidth,
}: {
  label?: string;
  ariaLabel?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  helperText?: React.ReactNode;
  minWidth?: number | string;
  id?: string;
  fullWidth?: boolean;
}) {
  return (
    <TextField
      select
      id={id}
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      helperText={helperText}
      fullWidth={fullWidth ?? !!label}
      sx={{ minWidth, maxWidth: '100%' }}
      slotProps={{
        // The visible MUI select is a div[role=combobox]; name it when there's no visible label.
        select: label ? undefined : { SelectDisplayProps: { 'aria-label': ariaLabel } as React.HTMLAttributes<HTMLDivElement> },
      }}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Text field with a leading search icon. */
export function SearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      sx={{ flex: 1, minWidth: 192 }}
      slotProps={{
        htmlInput: { 'aria-label': ariaLabel },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} color={TOKENS.steel} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
