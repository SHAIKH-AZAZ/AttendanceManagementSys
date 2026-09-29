// Browser-side helpers shared by the portals: API access, formatting and display labels.
import { useCallback, useEffect, useState } from 'react';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  LeaveStatus,
  LeaveType,
  SectionSummary,
  UserRole,
} from '@/types';

/** Minimum attendance percentage for examination eligibility. */
export const THRESHOLD = 75;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error || `The server responded with status ${res.status}.`);
  }
  return body as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, data: unknown = {}) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(url: string, data: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
};

/**
 * Loads JSON from one URL (or several, in parallel) and keeps it in sync with the URL.
 * `reload()` refetches while keeping the previous data on screen.
 */
export function useApi<T>(url: string | string[] | null) {
  const key = url === null ? null : JSON.stringify(url);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    version: number;
    data?: T;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (key === null) return;
    let active = true;
    const target: string | string[] = JSON.parse(key);
    const pending = Array.isArray(target)
      ? Promise.all(target.map((u) => api.get(u)))
      : api.get(target);
    pending.then(
      (data) => {
        if (active) setLoaded({ key, version, data: data as T });
      },
      (err: Error) => {
        if (active) {
          setLoaded((prev) => ({
            key,
            version,
            data: prev?.key === key ? prev.data : undefined,
            error: err.message,
          }));
        }
      }
    );
    return () => {
      active = false;
    };
  }, [key, version]);

  const current = loaded?.key === key ? loaded : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: key !== null && current?.version !== version,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}

// --- Display metadata ---

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export const STATUSES: { value: AttendanceStatus; code: string; label: string; tone: Tone }[] = [
  { value: 'PRESENT', code: 'P', label: 'Present', tone: 'success' },
  { value: 'ABSENT', code: 'A', label: 'Absent', tone: 'danger' },
  { value: 'LATE', code: 'L', label: 'Late', tone: 'warning' },
  { value: 'EXCUSED', code: 'E', label: 'Excused', tone: 'info' },
  { value: 'MEDICAL_LEAVE', code: 'M', label: 'Medical leave', tone: 'info' },
  { value: 'ON_DUTY', code: 'O', label: 'On duty', tone: 'info' },
];

export const LEAVE_TYPES: Record<LeaveType, string> = {
  MEDICAL: 'Medical',
  ON_DUTY: 'On duty',
  CASUAL: 'Casual',
  BEREAVEMENT: 'Bereavement',
};

export const LEAVE_STATUS_TONE: Record<LeaveStatus, Tone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Student',
  FACULTY: 'Faculty',
  HOD: 'Head of department',
  ADMIN_STAFF: 'Administrator',
};

export const sectionLabel = (section: SectionSummary, courses: Course[]) => {
  const course = courses.find((c) => c.id === section.courseId);
  return course ? `${course.code} ${course.title}, ${section.name}` : section.name;
};

/** Share of students not marked absent; late and authorized absences count as attended. */
export const attendanceRate = (records: Pick<AttendanceRecord, 'status'>[]) =>
  records.length
    ? (records.filter((r) => r.status !== 'ABSENT').length / records.length) * 100
    : 0;

// --- Formatting ---

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
// Plain YYYY-MM-DD values are calendar dates; format them in UTC so they never shift a day.
const calendarDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (value: string) =>
  (/^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDateFormat : dateFormat).format(new Date(value));

export const formatDateTime = (value: string) => dateTimeFormat.format(new Date(value));

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

/** plural(1, 'lecture') -> "1 lecture", plural(3, 'lecture') -> "3 lectures" */
export const plural = (count: number, word: string, pluralWord = `${word}s`) =>
  `${count} ${count === 1 ? word : pluralWord}`;

/** Inclusive number of days between two YYYY-MM-DD dates. */
export const dayCount = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;

/** Today's date in the browser's time zone, as YYYY-MM-DD. */
export const todayISO = () => new Date().toLocaleDateString('en-CA');

/** USER_LOGIN -> "User login" */
export const humanize = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ');

export const initials = (name: string) =>
  name
    .replace(/^(prof|dr|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
