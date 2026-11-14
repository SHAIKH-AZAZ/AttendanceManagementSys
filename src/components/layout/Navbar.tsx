'use client';

import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole } from '@/types';
import { BookOpen, ChevronDown, GraduationCap, LogOut, ShieldCheck, UserCog } from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onLogout?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ROLE_META: Record<UserRole, { label: string; icon: typeof BookOpen }> = {
  FACULTY: { label: 'Faculty', icon: BookOpen },
  STUDENT: { label: 'Student', icon: GraduationCap },
  HOD: { label: 'Head of department', icon: ShieldCheck },
  ADMIN_STAFF: { label: 'Admin staff', icon: UserCog },
};

const TABS: Record<UserRole, { id: string; label: string }[]> = {
  FACULTY: [
    { id: 'marking', label: 'Mark attendance' },
    { id: 'history', label: 'Past sessions' },
    { id: 'compliance', label: '75% defaulters' },
  ],
  STUDENT: [
    { id: 'student-overview', label: 'My attendance' },
    { id: 'student-leaves', label: 'Leave' },
  ],
  HOD: [
    { id: 'hod-overview', label: 'Department overview' },
    { id: 'hod-leaves', label: 'Leave approvals' },
    { id: 'hod-defaulters', label: 'Defaulter actions' },
  ],
  ADMIN_STAFF: [
    { id: 'admin-config', label: 'Academic hierarchy' },
    { id: 'admin-import', label: 'Bulk import' },
    { id: 'admin-reports', label: 'University reports' },
    { id: 'admin-users', label: 'Users' },
    { id: 'admin-audit', label: 'Audit log' },
  ],
};

const initials = (name: string) =>
  name
    .replace(/^(Prof|Dr|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, activeTab, setActiveTab }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const role = ROLE_META[currentUser.role];
  const RoleIcon = role.icon;

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Keep the active tab visible in the horizontal strip (scrollLeft only, never page scroll).
  useEffect(() => {
    const strip = stripRef.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !tab) return;
    const left = tab.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = left - 32;
    }
  }, [activeTab]);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-2.5 font-bold text-slate-800">
            <span className="w-9 h-9 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-base">AttendEASE365</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-3 pl-1.5 pr-2.5 h-11 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors text-left"
              >
                <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-2xs font-bold flex items-center justify-center">
                  {initials(currentUser.fullName)}
                </span>
                <span className="hidden sm:block leading-tight">
                  <span className="block text-sm font-semibold text-slate-800">{currentUser.fullName}</span>
                  <span className="block text-2xs text-slate-500">{role.label}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-lg z-50 animate-fade-in overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-3 border-b border-slate-200">
                    <span className="w-10 h-10 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center">
                      <RoleIcon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{currentUser.fullName}</div>
                      <div className="text-2xs text-slate-500 truncate">{currentUser.email}</div>
                      <div className="text-2xs font-semibold text-brand-700 mt-0.5">{role.label}</div>
                    </div>
                  </div>
                  {onLogout && (
                    <div className="p-1.5">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 h-10 rounded-lg text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section tabs: 2px accent underline, scrolls sideways on small screens */}
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Sections"
          className="flex gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mb-px -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {TABS[currentUser.role].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 h-11 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
