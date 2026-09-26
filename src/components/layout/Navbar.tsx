'use client';

import React from 'react';
import { User, UserRole } from '@/types';
import {
  GraduationCap,
  ShieldCheck,
  Building2,
  Layers,
  ChevronDown,
  UserCog,
  BookOpen,
  Sparkles,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (role: UserRole) => void;
  onLogout?: () => void;
  allUsers: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onLogout,
  allUsers,
  activeTab,
  setActiveTab,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = React.useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'FACULTY':
        return {
          label: 'Faculty',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: BookOpen,
        };
      case 'HOD':
        return {
          label: 'HOD',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: ShieldCheck,
        };
      case 'ADMIN_STAFF':
        return {
          label: 'Admin Staff',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: UserCog,
        };
      case 'STUDENT':
        return {
          label: 'Student',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: GraduationCap,
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const BadgeIcon = badge.icon;

  const roleUsers: { [key in UserRole]?: User } = {
    FACULTY: allUsers.find((u) => u.role === 'FACULTY'),
    STUDENT: allUsers.find((u) => u.role === 'STUDENT' && u.id === 'stu-4'),
    HOD: allUsers.find((u) => u.role === 'HOD'),
    ADMIN_STAFF: allUsers.find((u) => u.role === 'ADMIN_STAFF'),
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/95 border-b border-slate-200/90 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-black/5">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  AttendEASE<span className="text-indigo-600">365</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Enterprise
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  North Campus
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Computer Science & Engg
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs based on Current Role */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {currentUser.role === 'FACULTY' && (
              <>
                <button
                  onClick={() => setActiveTab('marking')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'marking'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Classroom Marking
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'history'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Past Sessions
                </button>
                <button
                  onClick={() => setActiveTab('compliance')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'compliance'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  75% Defaulter Monitor
                </button>
              </>
            )}

            {currentUser.role === 'STUDENT' && (
              <>
                <button
                  onClick={() => setActiveTab('student-overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'student-overview'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  My Attendance
                </button>
                <button
                  onClick={() => setActiveTab('student-leaves')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'student-leaves'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Apply & Track Leave
                </button>
              </>
            )}

            {currentUser.role === 'HOD' && (
              <>
                <button
                  onClick={() => setActiveTab('hod-overview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'hod-overview'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Department Overview
                </button>
                <button
                  onClick={() => setActiveTab('hod-leaves')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'hod-leaves'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Leave Approvals
                </button>
                <button
                  onClick={() => setActiveTab('hod-defaulters')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'hod-defaulters'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Defaulter Action Desk
                </button>
              </>
            )}

            {currentUser.role === 'ADMIN_STAFF' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-config')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'admin-config'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Academic Hierarchy
                </button>
                <button
                  onClick={() => setActiveTab('admin-import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'admin-import'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  Bulk CSV/Excel Import
                </button>
                <button
                  onClick={() => setActiveTab('admin-reports')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'admin-reports'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  University Reports
                </button>
                <button
                  onClick={() => setActiveTab('admin-users')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'admin-users'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setActiveTab('admin-audit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'admin-audit'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  System Audit Logs
                </button>
              </>
            )}
          </nav>

          {/* Interactive Role Switcher & Sign Out */}
          <div className="flex items-center gap-2">
            <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all text-left shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <BadgeIcon className="w-4 h-4 text-slate-700" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {currentUser.fullName}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                  {currentUser.email}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-50 ring-1 ring-black/5 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Switch Role Demo Context
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Experience AttendEASE365 from any role perspective
                  </p>
                </div>

                <div className="p-1 space-y-1">
                  {/* Faculty */}
                  <button
                    onClick={() => {
                      onSwitchUser('FACULTY');
                      setActiveTab('marking');
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      currentUser.role === 'FACULTY'
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {roleUsers.FACULTY?.fullName || 'Prof. Rajesh Sharma'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Faculty • Mark classes & lock attendance
                      </div>
                    </div>
                  </button>

                  {/* Student */}
                  <button
                    onClick={() => {
                      onSwitchUser('STUDENT');
                      setActiveTab('student-overview');
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      currentUser.role === 'STUDENT'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Devendra Joshi (CS-2026-004)
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Student • View stats & apply for leaves
                      </div>
                    </div>
                  </button>

                  {/* HOD */}
                  <button
                    onClick={() => {
                      onSwitchUser('HOD');
                      setActiveTab('hod-overview');
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      currentUser.role === 'HOD'
                        ? 'bg-amber-50 border border-amber-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {roleUsers.HOD?.fullName || 'Dr. Sunita Rao'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        HOD • Department monitor & leave approvals
                      </div>
                    </div>
                  </button>

                  {/* Admin */}
                  <button
                    onClick={() => {
                      onSwitchUser('ADMIN_STAFF');
                      setActiveTab('admin-config');
                      setRoleDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${
                      currentUser.role === 'ADMIN_STAFF'
                        ? 'bg-purple-50 border border-purple-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <UserCog className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {roleUsers.ADMIN_STAFF?.fullName || 'Arun Kulkarni'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Admin • Hierarchy, CSV imports & board reports
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 px-2 space-y-1">
                  {onLogout && (
                    <button
                      onClick={() => {
                        setRoleDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  )}
                  <div className="pt-1 px-1 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Backend: MongoDB</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Connection
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Sign Out Header Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 transition-all shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  </header>
);
};
