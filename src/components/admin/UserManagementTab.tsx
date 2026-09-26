'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, Campus, Department } from '@/types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  GraduationCap,
  BookOpen,
  UserCog,
  CheckCircle2,
  XCircle,
  Sparkles,
  Building2,
  Trash2,
} from 'lucide-react';

export const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // New User Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('FACULTY');
  const [campusId, setCampusId] = useState('campus-1');
  const [departmentId, setDepartmentId] = useState('dept-cs');
  const [password, setPassword] = useState('welcome123');
  const [codeIdentifier, setCodeIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchMetas = async () => {
    try {
      const campRes = await fetch('/api/sessions'); // meta helper or campuses
      // In seed data:
      setCampuses([
        { id: 'campus-1', code: 'NORTH', name: 'North Campus', address: '', isActive: true },
        { id: 'campus-2', code: 'SOUTH', name: 'South Campus', address: '', isActive: true },
        { id: 'campus-3', code: 'CITY', name: 'City Campus', address: '', isActive: true },
      ]);
      setDepartments([
        { id: 'dept-cs', campusId: 'campus-1', code: 'CSE', name: 'Computer Science', isActive: true },
        { id: 'dept-it', campusId: 'campus-1', code: 'IT', name: 'Information Tech', isActive: true },
        { id: 'dept-ec', campusId: 'campus-1', code: 'ECE', name: 'Electronics & Comm', isActive: true },
        { id: 'dept-civil', campusId: 'campus-2', code: 'CIVIL', name: 'Civil Engg', isActive: true },
      ]);
    } catch (err) {
      console.error('Error fetching campuses:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMetas();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          role,
          campusId,
          departmentId,
          password,
          employeeCode: role === 'FACULTY' ? codeIdentifier : undefined,
          enrollmentNumber: role === 'STUDENT' ? codeIdentifier : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddUserModalOpen(false);
        setFullName('');
        setEmail('');
        setCodeIdentifier('');
        setNotification({
          type: 'success',
          message: `User ${data.user.fullName} created successfully with role ${data.user.role}.`,
        });
        fetchUsers();
      } else {
        setNotification({
          type: 'error',
          message: data.error || 'Failed to create user',
        });
      }
    } catch {
      setNotification({ type: 'error', message: 'Network error creating user.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: `User status changed to ${!user.isActive ? 'Active' : 'Inactive'}.`,
        });
        fetchUsers();
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to update user status.' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user account?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setNotification({
          type: 'success',
          message: 'User account deactivated successfully.',
        });
        fetchUsers();
      }
    } catch {
      setNotification({ type: 'error', message: 'Failed to deactivate user.' });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.studentProfile?.enrollmentNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.facultyProfile?.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = selectedRole === 'ALL' || u.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRole]);

  return (
    <div className="space-y-5">
      {/* Top Banner & User Counters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            User & Access Management (RBAC)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage university accounts, credentials, role assignments, and campus tenant isolation.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          + Create New User
        </button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, roll number, or employee ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-600 font-medium">Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-xl px-3 py-1.5 font-medium focus:outline-none"
          >
            <option value="ALL">All Roles ({users.length})</option>
            <option value="FACULTY">Faculty</option>
            <option value="STUDENT">Student</option>
            <option value="HOD">Head of Department (HOD)</option>
            <option value="ADMIN_STAFF">Admin Staff</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Campus & Dept</th>
                <th className="py-3 px-4">Identifier / Code</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((u) => {
                const identifier =
                  u.studentProfile?.enrollmentNumber ||
                  u.facultyProfile?.employeeCode ||
                  'N/A';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.fullName}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          u.role === 'FACULTY'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : u.role === 'STUDENT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : u.role === 'HOD'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>North Campus</div>
                      <div className="text-[11px] text-slate-500">
                        {u.departmentId ? 'Computer Science & Engg' : 'All Departments'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {identifier}
                    </td>
                    <td className="py-3 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 shadow-2xs"
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          title="Deactivate Account"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Register New User Account
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="FACULTY">Faculty (Instructor)</option>
                    <option value="STUDENT">Student</option>
                    <option value="HOD">Head of Department (HOD)</option>
                    <option value="ADMIN_STAFF">Admin Staff / Registrar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    {role === 'STUDENT' ? 'Enrollment Number' : 'Employee ID Code'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={role === 'STUDENT' ? 'e.g. CS-2026-050' : 'e.g. FAC-CSE-115'}
                    value={codeIdentifier}
                    onChange={(e) => setCodeIdentifier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Gupta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh.gupta@univ.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Campus Assignment</label>
                  <select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="campus-1">North Campus (Engineering)</option>
                    <option value="campus-2">South Campus (Sciences)</option>
                    <option value="campus-3">City Campus (Executive)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="dept-cs">Computer Science & Engg</option>
                    <option value="dept-it">Information Technology</option>
                    <option value="dept-ec">Electronics & Communication</option>
                    <option value="dept-civil">Civil Engineering</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Initial Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Commit User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
