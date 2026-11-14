'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMeta } from '@/hooks/useMeta';
import type { User, UserRole } from '@/types';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  Notice,
  type NoticeTone,
  PageHeader,
  SegmentedControl,
  inputClass,
} from '@/components/ui';
import { Search, UserPlus, Users } from 'lucide-react';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'HOD', label: 'HOD' },
  { value: 'ADMIN_STAFF', label: 'Admin staff' },
];
const roleLabel = (r: UserRole) => ROLES.find((x) => x.value === r)?.label ?? r;

export const UserManagementTab: React.FC = () => {
  const { user: me } = useAuth();
  const { meta } = useMeta();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [campusId, setCampusId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers((await res.json()).users ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const campusName = (id: string) => meta?.campuses.find((c) => c.id === id)?.name ?? '—';
  const deptName = (id?: string) => (id ? meta?.departments.find((d) => d.id === id)?.name ?? id : 'All departments');
  const campusDepts = meta?.departments.filter((d) => d.campusId === campusId) ?? [];

  const openCreate = () => {
    setFullName('');
    setEmail('');
    setRole('STUDENT');
    setCode('');
    setPassword('');
    const c = meta?.campuses[0]?.id ?? '';
    setCampusId(c);
    setDepartmentId(meta?.departments.find((d) => d.campusId === c)?.id ?? '');
    setCreateOpen(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          role,
          campusId,
          departmentId: departmentId || undefined,
          password,
          employeeCode: role === 'FACULTY' || role === 'HOD' ? code.trim() || undefined : undefined,
          enrollmentNumber: role === 'STUDENT' ? code.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        setNotice({ tone: 'success', text: `${data.user.fullName} can now sign in as ${roleLabel(data.user.role)} with ${data.user.email}.` });
        load();
      } else setNotice({ tone: 'error', text: data.error || 'Could not create the account.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    if (!toggleTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${toggleTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !toggleTarget.isActive }),
      });
      const data = await res.json();
      setNotice(
        res.ok
          ? { tone: 'success', text: `${toggleTarget.fullName} is now ${toggleTarget.isActive ? 'deactivated and signed out' : 'active'}.` }
          : { tone: 'error', text: data.error || 'Could not update the account.' }
      );
      setToggleTarget(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === 'ALL' || u.role === roleFilter) &&
        (!q ||
          [u.fullName, u.email, u.studentProfile?.enrollmentNumber, u.facultyProfile?.employeeCode]
            .filter(Boolean)
            .some((v) => v!.toLowerCase().includes(q)))
    );
  }, [users, query, roleFilter]);

  const passwordError = password && password.length < 8 ? 'Use at least 8 characters.' : null;

  return (
    <div>
      <PageHeader
        title="Users"
        description="Create accounts and control who can sign in. Deactivated users are signed out immediately."
        actions={<Button variant="primary" icon={UserPlus} onClick={openCreate}>Add user</Button>}
      />

      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)} className="mb-5">
          {notice.text}
        </Notice>
      )}

      <Card padded={false}>
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-200">
          <div className="relative flex-1 min-w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, roll no. or employee ID"
              aria-label="Search users"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="overflow-x-auto [scrollbar-width:none]">
            <SegmentedControl
              label="Role"
              value={roleFilter}
              onChange={setRoleFilter}
              options={[
                { value: 'ALL' as const, label: 'All', count: users.length },
                ...ROLES.map((r) => ({ value: r.value, label: r.label, count: users.filter((u) => u.role === r.value).length })),
              ]}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={Users} title="No users match" description="Try a different search or role." />
        ) : (
          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Name</th>
                  <th className="py-2.5 px-3 font-semibold">Role</th>
                  <th className="py-2.5 px-3 font-semibold">Campus / department</th>
                  <th className="py-2.5 px-3 font-semibold">ID</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((u) => (
                  <tr key={u.id} className={u.isActive ? '' : 'bg-slate-50 text-slate-400'}>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {u.fullName}
                        {u.id === me?.id && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge tone={u.role === 'STUDENT' ? 'neutral' : 'accent'}>{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-700">{campusName(u.campusId)}</div>
                      <div className="text-xs text-slate-500">{deptName(u.departmentId)}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">
                      {u.studentProfile?.enrollmentNumber || u.facultyProfile?.employeeCode || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge tone={u.isActive ? 'good' : 'neutral'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.id !== me?.id && (
                        <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => setToggleTarget(u)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create user */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon={UserPlus}
        title="Add user"
        description="They sign in with this email and the password you set here."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" icon={UserPlus} type="submit" form="create-user" loading={busy} disabled={!!passwordError}>
              Create account
            </Button>
          </>
        }
      >
        <form id="create-user" onSubmit={create} className="grid sm:grid-cols-2 gap-4">
          <Field label="Role" htmlFor="u-role">
            <select id="u-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>
          <Field label={role === 'STUDENT' ? 'Roll number' : 'Employee ID'} htmlFor="u-code" hint="Leave empty to generate one.">
            <input id="u-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={role === 'STUDENT' ? 'CS-2026-050' : 'FAC-115'} className={inputClass} />
          </Field>
          <Field label="Full name" htmlFor="u-name">
            <input id="u-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="u-email">
            <input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Campus" htmlFor="u-campus">
            <select
              id="u-campus"
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setDepartmentId(meta?.departments.find((d) => d.campusId === e.target.value)?.id ?? '');
              }}
              className={inputClass}
            >
              {meta?.campuses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Department" htmlFor="u-dept">
            <select id="u-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
              {role === 'ADMIN_STAFF' && <option value="">All departments</option>}
              {campusDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Initial password" htmlFor="u-pass" hint={passwordError ?? 'At least 8 characters. Share it with the person privately.'}>
              <input id="u-pass" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Activate / deactivate */}
      <Modal
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.isActive ? `Deactivate ${toggleTarget?.fullName}?` : `Activate ${toggleTarget?.fullName}?`}
        description={
          toggleTarget?.isActive
            ? 'They are signed out now and can’t sign in until reactivated. Their records are kept.'
            : 'They will be able to sign in again with their existing password.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setToggleTarget(null)}>Cancel</Button>
            <Button variant={toggleTarget?.isActive ? 'danger' : 'primary'} loading={busy} onClick={toggleActive}>
              {toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </>
        }
      />
    </div>
  );
};
