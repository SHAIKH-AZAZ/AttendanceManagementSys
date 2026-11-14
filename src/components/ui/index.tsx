'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import type { AttendanceStatus, LeaveStatus, LeaveType } from '@/types';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ Button */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 hover:bg-brand-700 text-white border-transparent',
  secondary: 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 border-transparent',
  danger: 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200',
  success: 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: React.ElementType;
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold whitespace-nowrap transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-xs',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        Icon && <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      )}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={cx('bg-white border border-slate-200 rounded-2xl shadow-sm', padded && 'p-5', className)}>
      {children}
    </div>
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
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
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
    <div className="mb-6">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-800">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- StatCard */

type Tone = 'neutral' | 'accent' | 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'sky';

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-slate-800',
  accent: 'text-brand-700',
  good: 'text-emerald-700',
  bad: 'text-rose-600',
  warn: 'text-amber-700',
  info: 'text-blue-700',
  violet: 'text-violet-700',
  sky: 'text-sky-700',
};

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
    <>
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
        <span>{label}</span>
        {Icon && <Icon className={cx('w-4 h-4', TONE_TEXT[tone === 'neutral' ? 'accent' : tone])} />}
      </div>
      <div className={cx('mt-1.5 text-2xl font-bold tracking-[-0.02em]', TONE_TEXT[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </>
  );
  const cls = 'flex flex-col justify-start bg-white border border-slate-200 rounded-2xl shadow-sm p-5 text-left';
  return onClick ? (
    <button onClick={onClick} className={cx(cls, 'lift w-full hover:border-brand-200')}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ------------------------------------------------------------------- Badge */

const BADGE_TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  accent: 'bg-brand-50 text-brand-700 border-brand-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
};

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
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-semibold whitespace-nowrap',
        BADGE_TONES[tone],
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------- Attendance status */

export const ATTENDANCE_STATUS: Record<
  AttendanceStatus,
  { label: string; short: string; tone: Tone; solid: string }
> = {
  PRESENT: { label: 'Present', short: 'P', tone: 'good', solid: 'bg-emerald-600 text-white' },
  ABSENT: { label: 'Absent', short: 'A', tone: 'bad', solid: 'bg-rose-600 text-white' },
  LATE: { label: 'Late', short: 'L', tone: 'warn', solid: 'bg-amber-500 text-white' },
  EXCUSED: { label: 'Excused', short: 'E', tone: 'info', solid: 'bg-blue-600 text-white' },
  MEDICAL_LEAVE: { label: 'Medical', short: 'M', tone: 'violet', solid: 'bg-violet-600 text-white' },
  ON_DUTY: { label: 'On duty', short: 'O', tone: 'sky', solid: 'bg-sky-600 text-white' },
};

export const ATTENDANCE_ORDER = Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[];

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = ATTENDANCE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
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
    <div className="flex flex-col items-center text-center py-12 px-4">
      <span className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ Notice */

const NOTICE_TONES = {
  success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: CheckCircle2 },
  error: { cls: 'bg-rose-50 border-rose-200 text-rose-800', icon: AlertCircle },
  warn: { cls: 'bg-amber-50 border-amber-200 text-amber-900', icon: AlertCircle },
  info: { cls: 'bg-brand-50 border-brand-200 text-brand-800', icon: Info },
};

export type NoticeTone = keyof typeof NOTICE_TONES;

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
  const { cls, icon: Icon } = NOTICE_TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 p-3 rounded-xl border text-sm', cls, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
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
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Callers pass inline handlers; keep the latest in a ref so the effect below
  // runs once per open (re-running it would steal focus on every keystroke).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first =
      bodyRef.current?.querySelector<HTMLElement>('input, select, textarea') ??
      panelRef.current?.querySelector<HTMLElement>('[data-modal-footer] button:last-child');
    first?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-lg max-h-[92vh] flex flex-col',
          size === 'md' ? 'sm:max-w-md' : 'sm:max-w-2xl'
        )}
      >
        <div className="flex items-start gap-3 p-5 border-b border-slate-200">
          {Icon && (
            <span className="w-10 h-10 shrink-0 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-800">
              {title}
            </h2>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children && (
          <div ref={bodyRef} className="p-5 overflow-y-auto">
            {children}
          </div>
        )}
        {footer && (
          <div data-modal-footer className="flex flex-wrap justify-end gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Fields */

/** Inline (filter/toolbar) select: sized to content instead of full width. */
export const selectClass =
  'h-10 max-w-full pl-3 pr-8 bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 hover:border-slate-300 focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100';

export const inputClass =
  'w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-base sm:text-sm text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:border-brand-600 focus:ring-3 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-2xs text-slate-500">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------ ProgressBar */

export function ProgressBar({ value, threshold = 75 }: { value: number; threshold?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative h-2 rounded-full bg-slate-100" role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cx('h-full rounded-full', v < threshold ? 'bg-rose-600' : 'bg-emerald-600')}
        style={{ width: `${v}%` }}
      />
      <span className="absolute -top-1 h-4 w-0.5 bg-slate-400" style={{ left: `${threshold}%` }} aria-hidden="true" />
    </div>
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
    <div role="radiogroup" aria-label={label} className="inline-flex p-1 rounded-lg bg-slate-100 border border-slate-200">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-colors',
            value === o.value ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
