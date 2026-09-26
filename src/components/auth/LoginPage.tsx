'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import {
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  UserCog,
  Sparkles,
  AlertCircle,
  Building2,
  KeyRound,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAs, isLoading } = useAuth();
  const [email, setEmail] = useState('rajesh.sharma@univ.edu');
  const [password, setPassword] = useState('faculty123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials');
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError(null);
    try {
      await loginAs(role);
    } catch (err) {
      setError((err as Error).message || 'SSO Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 antialiased">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-black/5">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>

        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
          AttendEASE<span className="text-indigo-600">365</span>
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          University Attendance & Academic Compliance Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200/90 rounded-3xl shadow-sm space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@univ.edu"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-bold text-slate-700"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  Default: role123
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick SSO Logins */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              1-Click Demo SSO Personas
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Instant authentication without entering credentials:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('FACULTY')}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left flex items-start gap-2"
              >
                <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[11px]">Faculty</div>
                  <div className="text-[10px] text-slate-500">Prof. Sharma</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('STUDENT')}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all text-left flex items-start gap-2"
              >
                <div className="p-1 rounded-md bg-emerald-100 text-emerald-700">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[11px]">Student</div>
                  <div className="text-[10px] text-slate-500">Devendra (72%)</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('HOD')}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 transition-all text-left flex items-start gap-2"
              >
                <div className="p-1 rounded-md bg-amber-100 text-amber-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[11px]">HOD</div>
                  <div className="text-[10px] text-slate-500">Dr. Sunita Rao</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('ADMIN_STAFF')}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 transition-all text-left flex items-start gap-2"
              >
                <div className="p-1 rounded-md bg-purple-100 text-purple-700">
                  <UserCog className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[11px]">Admin Staff</div>
                  <div className="text-[10px] text-slate-500">Arun (Registrar)</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          Protected by Enterprise Role-Based Access Control (RBAC) & Multi-Campus Isolation
        </div>
      </div>
    </div>
  );
};
