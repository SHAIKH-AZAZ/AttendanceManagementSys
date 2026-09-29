'use client';

// Shared UI primitives. Every portal builds from these so spacing, color and behavior stay consistent.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
} from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { formatPercent, THRESHOLD, type Tone } from '@/lib/client';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// --- Buttons & badges ---

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-slate-50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
};

export const buttonClass = (variant: ButtonVariant = 'primary', size: 'sm' | 'md' = 'md') =>
  cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-55 aria-busy:[&>svg]:hidden [&_svg]:size-4 [&_svg]:shrink-0',
    size === 'sm' ? 'h-8 px-3' : 'h-9 px-3.5',
    buttonVariants[variant]
  );

export function Button({
  variant,
  size,
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant, size), className)}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

const badgeTones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-300/70',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  success: 'bg-green-50 text-green-800 ring-green-600/25',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  danger: 'bg-red-50 text-red-800 ring-red-600/25',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/25',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset [&_svg]:size-3',
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  );
}

// --- Page structure ---

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-serif text-[1.625rem] leading-tight font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

const statColumns: Record<number, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
};

/** A row of headline figures in one bordered strip. */
export function Stats({
  items,
  className,
}: {
  items: { label: string; value: ReactNode; detail?: ReactNode; alert?: boolean }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200',
        '[&>div:last-child:nth-child(odd)]:col-span-2 lg:[&>div:last-child:nth-child(odd)]:col-span-1',
        statColumns[items.length],
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="bg-white px-5 py-4">
          <dt className="text-sm text-slate-600">{item.label}</dt>
          <dd
            className={cn(
              'mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums',
              item.alert && 'text-red-700'
            )}
          >
            {item.value}
          </dd>
          {item.detail && <dd className="mt-0.5 text-sm text-slate-500">{item.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Attendance bar with a fixed tick at the eligibility threshold. Decorative: always pair it with the number. */
export function Meter({ value, className }: { value: number; className?: string }) {
  return (
    <div aria-hidden className={cn('relative h-1.5 rounded-full bg-slate-200', className)}>
      <div
        className={cn('h-full rounded-full', value >= THRESHOLD ? 'bg-green-600' : 'bg-red-600')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
      <div
        className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-slate-800"
        style={{ left: `${THRESHOLD}%` }}
      />
    </div>
  );
}

export function AttendanceValue({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'w-14 text-right font-medium tabular-nums',
          value < THRESHOLD ? 'text-red-700' : 'text-slate-900'
        )}
      >
        {formatPercent(value)}
      </span>
      <Meter value={value} className="w-24 sm:w-32" />
    </div>
  );
}

/** Name with a secondary identifier (roll number, email) underneath. */
export function Person({ name, detail }: { name: string; detail?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-slate-900">{name}</div>
      {detail && <div className="text-xs whitespace-nowrap text-slate-500 tabular-nums">{detail}</div>}
    </div>
  );
}

// --- Tables ---

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-left text-sm', className)}>{children}</table>
    </div>
  );
}

export const th =
  'border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium whitespace-nowrap text-slate-600 first:pl-5 last:pr-5 sm:px-4';
export const td = 'px-3 py-3 align-middle first:pl-5 last:pr-5 sm:px-4';

// --- Forms ---

export const control =
  'block h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
export const textareaClass = cn(control, 'h-auto py-2 leading-relaxed');

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

// --- Feedback ---

const noticeTones = {
  info: { box: 'border-slate-200 bg-slate-50 text-slate-700', icon: Info, iconClass: 'text-slate-500' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: TriangleAlert, iconClass: 'text-amber-600' },
  danger: { box: 'border-red-200 bg-red-50 text-red-950', icon: XCircle, iconClass: 'text-red-600' },
  success: { box: 'border-green-200 bg-green-50 text-green-950', icon: CheckCircle2, iconClass: 'text-green-600' },
};

export function Notice({
  tone = 'info',
  title,
  className,
  children,
}: {
  tone?: keyof typeof noticeTones;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  const { box, icon: Icon, iconClass } = noticeTones[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-md border px-4 py-3 text-sm', box, className)}>
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', iconClass)} />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Placeholder for data that is loading or failed to load. */
export function LoadState({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="max-w-md text-sm text-slate-700">
          <span className="font-medium text-slate-900">This data couldn’t be loaded.</span> {error}
        </p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  return (
    <div role="status" className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-600">
      <Spinner className="text-slate-400" /> Loading…
    </div>
  );
}

// --- Dialogs (native <dialog>: focus trap, Escape and inert background come from the browser) ---

const dialogSizes = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' };

export function Dialog({
  title,
  description,
  size = 'md',
  footer,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  size?: keyof typeof dialogSizes;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // A click that lands on the dialog element itself is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-hidden rounded-lg bg-white p-0 text-slate-900 shadow-2xl ring-1 ring-slate-900/10 backdrop:bg-slate-950/50',
        dialogSizes[size]
      )}
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
            className="-m-1.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>
        )}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({
  title,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">{children}</div>
    </Dialog>
  );
}

/**
 * Dialog wrapping a native form. `onSubmit` receives the form data (including which action
 * button was pressed, as `action`); throw to show the message inline and keep the dialog open.
 */
export function FormDialog({
  title,
  description,
  size,
  submitLabel = 'Save',
  actions,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  size?: keyof typeof dialogSizes;
  submitLabel?: string;
  actions?: { label: string; value: string; variant?: ButtonVariant }[];
  onSubmit: (data: FormData) => Promise<void>;
  onClose: () => void;
  children: ReactNode;
}) {
  const formId = useId();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buttons = actions ?? [{ label: submitLabel, value: 'submit' }];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    setPending(data.get('action')?.toString() ?? 'submit');
    setError(null);
    try {
      await onSubmit(data);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setPending(null);
    }
  }

  return (
    <Dialog
      title={title}
      description={description}
      size={size}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending !== null}>
            Cancel
          </Button>
          {buttons.map((button) => (
            <Button
              key={button.value}
              type="submit"
              form={formId}
              name="action"
              value={button.value}
              variant={button.variant ?? 'primary'}
              loading={pending === button.value}
              disabled={pending !== null}
            >
              {button.label}
            </Button>
          ))}
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {error && <Notice tone="danger">{error}</Notice>}
        {children}
      </form>
    </Dialog>
  );
}

// --- Toasts ---

type Toast = { id: number; tone: 'success' | 'error'; message: string };
type Notify = (message: string, tone?: Toast['tone']) => void;

const ToastContext = createContext<Notify>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const notify = useCallback<Notify>(
    (message, tone = 'success') => {
      const id = ++nextId.current;
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto print:hidden"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg motion-safe:animate-[toast-in_160ms_ease-out]"
          >
            {toast.tone === 'success' ? (
              <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-green-600" />
            ) : (
              <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
            )}
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(toast.id)}
              className="-m-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
