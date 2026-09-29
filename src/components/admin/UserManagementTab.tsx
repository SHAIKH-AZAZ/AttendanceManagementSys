'use client';

import { useMemo, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import type { AcademicMeta, User, UserRole } from '@/types';
import { api, plural, ROLE_LABELS, useApi } from '@/lib/client';
import { useAuth } from '@/context/AuthContext';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  FormDialog,
  LoadState,
  PageHeader,
  Panel,
  Person,
  Table,
  cn,
  control,
  td,
  th,
  useToast,
} from '@/components/ui';

const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

export function UserManagementTab({ meta }: { meta: AcademicMeta }) {
  const notify = useToast();
  const { user: me } = useAuth();
  const q = useApi<{ users: User[] }>('/api/admin/users');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'ALL'>('ALL');
  const [campusId, setCampusId] = useState('ALL');
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const users = useMemo(() => q.data?.users ?? [], [q.data]);
  const needle = search.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      (role === 'ALL' || u.role === role) &&
      (campusId === 'ALL' || u.campusId === campusId) &&
      [u.fullName, u.email, u.studentProfile?.enrollmentNumber, u.facultyProfile?.employeeCode]
        .join(' ')
        .toLowerCase()
        .includes(needle)
  );

  async function setActive(user: User, isActive: boolean) {
    setBusyId(user.id);
    try {
      await api.put(`/api/admin/users/${user.id}`, { isActive });
      q.reload();
      notify(isActive ? `${user.fullName} can sign in again.` : `${user.fullName}’s account is deactivated.`);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts, roles and campus assignments. Deactivated users can’t sign in; their records are kept."
        actions={
          <Button onClick={() => setCreating(true)}>
            <UserPlus aria-hidden /> Add user
          </Button>
        }
      />
      <Panel>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center">
          <div className="relative lg:w-80">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or ID"
              aria-label="Search users"
              className={cn(control, 'pl-9')}
            />
          </div>
          <div className="flex gap-3">
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole | 'ALL')} aria-label="Filter by role" className={cn(control, 'lg:w-48')}>
              <option value="ALL">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <select value={campusId} onChange={(e) => setCampusId(e.target.value)} aria-label="Filter by campus" className={cn(control, 'lg:w-56')}>
              <option value="ALL">All campuses</option>
              {meta.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {q.data && (
            <p className="text-sm text-slate-500 lg:ml-auto">
              {shown.length === users.length ? plural(users.length, 'user') : `${shown.length} of ${users.length}`}
            </p>
          )}
        </div>

        {!q.data ? (
          <LoadState error={q.error} onRetry={q.reload} />
        ) : shown.length === 0 ? (
          <EmptyState title="No users match these filters" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Campus and department</th>
                <th className={th}>ID</th>
                <th className={th}>Status</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((u) => (
                <tr key={u.id}>
                  <td className={td}>
                    <Person name={u.fullName} detail={u.email} />
                  </td>
                  <td className={cn(td, 'whitespace-nowrap')}>{ROLE_LABELS[u.role]}</td>
                  <td className={td}>
                    <div className="text-slate-900">{meta.campuses.find((c) => c.id === u.campusId)?.name ?? '–'}</div>
                    <div className="text-xs text-slate-500">
                      {meta.departments.find((d) => d.id === u.departmentId)?.name ?? 'All departments'}
                    </div>
                  </td>
                  <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
                    {u.studentProfile?.enrollmentNumber ?? u.facultyProfile?.employeeCode ?? <span className="text-slate-400">–</span>}
                  </td>
                  <td className={td}>
                    <Badge tone={u.isActive ? 'success' : 'neutral'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge>
                  </td>
                  <td className={cn(td, 'text-right')}>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busyId === u.id}
                      disabled={busyId !== null || u.id === me?.id}
                      title={u.id === me?.id ? 'You can’t deactivate your own account' : undefined}
                      onClick={() => (u.isActive ? setDeactivating(u) : setActive(u, true))}
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      {creating && (
        <CreateUserDialog
          meta={meta}
          onClose={() => setCreating(false)}
          onCreated={(user) => {
            q.reload();
            notify(`Account created for ${user.fullName}.`);
          }}
        />
      )}

      {deactivating && (
        <ConfirmDialog
          title={`Deactivate ${deactivating.fullName}?`}
          confirmLabel="Deactivate account"
          variant="danger"
          onClose={() => setDeactivating(null)}
          onConfirm={() => setActive(deactivating, false)}
        >
          <p>
            They won’t be able to sign in. Attendance and leave records stay intact, and you can reactivate the account at
            any time.
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

function CreateUserDialog({
  meta,
  onClose,
  onCreated,
}: {
  meta: AcademicMeta;
  onClose: () => void;
  onCreated: (user: User) => void;
}) {
  // Role and campus decide which other fields apply, so they're controlled; the rest is read from the form.
  const [role, setRole] = useState<UserRole>('FACULTY');
  const [campusId, setCampusId] = useState(meta.campuses[0]?.id ?? '');
  const departments = meta.departments.filter((d) => d.campusId === campusId);
  const needsDepartment = role !== 'ADMIN_STAFF';
  const identifier = role === 'STUDENT' ? 'Enrollment number' : role === 'FACULTY' ? 'Employee code' : null;

  async function create(data: FormData) {
    if (needsDepartment && !data.get('departmentId')) {
      throw new Error('This campus has no departments. Choose another campus.');
    }
    const code = String(data.get('code') ?? '').trim() || undefined;
    const { user } = await api.post<{ user: User }>('/api/admin/users', {
      role,
      fullName: String(data.get('fullName')).trim(),
      email: String(data.get('email')).trim(),
      campusId,
      departmentId: needsDepartment ? data.get('departmentId') : undefined,
      password: data.get('password'),
      enrollmentNumber: role === 'STUDENT' ? code : undefined,
      employeeCode: role === 'FACULTY' ? code : undefined,
    });
    onCreated(user);
  }

  return (
    <FormDialog title="Add user" submitLabel="Create account" onClose={onClose} onSubmit={create}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={control}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        {identifier && (
          <Field label={identifier}>
            <input
              name="code"
              required
              placeholder={role === 'STUDENT' ? 'CS-2026-050' : 'FAC-CSE-115'}
              className={cn(control, 'tabular-nums')}
            />
          </Field>
        )}
      </div>
      <Field label="Full name">
        <input name="fullName" required autoComplete="off" className={control} />
      </Field>
      <Field label="Institutional email">
        <input name="email" type="email" required autoComplete="off" placeholder="name@univ.edu" className={control} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campus">
          <select value={campusId} onChange={(e) => setCampusId(e.target.value)} className={control}>
            {meta.campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {needsDepartment && (
          <Field label="Department">
            {/* Keyed by campus so the selection resets when the campus changes. */}
            <select key={campusId} name="departmentId" required className={control}>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <Field label="Initial password" hint="At least 8 characters. Share it with the user through a secure channel.">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={control} />
      </Field>
    </FormDialog>
  );
}
