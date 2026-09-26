'use client';

import React, { useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Navbar } from '@/components/layout/Navbar';
import { FacultyPortal } from '@/components/faculty/FacultyPortal';
import { StudentPortal } from '@/components/student/StudentPortal';
import { HODPortal } from '@/components/hod/HODPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { UniversityReportModal } from '@/components/reports/UniversityReportModal';
import { INITIAL_USERS } from '@/lib/seed-data';
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  UserCog,
  Database,
  Sparkles,
} from 'lucide-react';

function DashboardContent() {
  const { user, logout, loginAs, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('marking');
  const [reportModalCourse, setReportModalCourse] = useState<{
    courseId: string;
    sectionId: string;
  } | null>(null);

  // Sync default active tab on user/role switch
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case 'FACULTY':
          setActiveTab('marking');
          break;
        case 'STUDENT':
          setActiveTab('student-overview');
          break;
        case 'HOD':
          setActiveTab('hod-overview');
          break;
        case 'ADMIN_STAFF':
          setActiveTab('admin-config');
          break;
      }
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold">
            Loading AttendEASE365 Session...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, render LoginPage
  if (!user) {
    return <LoginPage />;
  }

  const allUsers: User[] = INITIAL_USERS;

  const handleOpenUniversityReport = (courseId: string, sectionId: string) => {
    setReportModalCourse({ courseId, sectionId });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-indigo-600 selection:text-white">
      {/* Top Navbar with onLogout */}
      <Navbar
        currentUser={user}
        onSwitchUser={(role) => loginAs(role)}
        onLogout={logout}
        allUsers={allUsers}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Quick Interactive Role Bar */}
      <div className="bg-white border-b border-slate-200/90 px-4 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-bold text-slate-800">Active Persona:</span>
            <span className="text-slate-500">Switch role to test full enterprise workflow:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loginAs('FACULTY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                user.role === 'FACULTY'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-700'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Faculty (Prof. Sharma)
            </button>

            <button
              onClick={() => loginAs('STUDENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                user.role === 'STUDENT'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student (Devendra ⚠ 72%)
            </button>

            <button
              onClick={() => loginAs('HOD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                user.role === 'HOD'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-700'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              HOD (Dr. Sunita Rao)
            </button>

            <button
              onClick={() => loginAs('ADMIN_STAFF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                user.role === 'ADMIN_STAFF'
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-700'
                  : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              Admin (Registrar)
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {user.role === 'FACULTY' && (
          <FacultyPortal
            activeTab={activeTab}
            onOpenUniversityReport={handleOpenUniversityReport}
          />
        )}

        {user.role === 'STUDENT' && (
          <StudentPortal activeTab={activeTab} />
        )}

        {user.role === 'HOD' && (
          <HODPortal
            activeTab={activeTab}
            onOpenUniversityReport={handleOpenUniversityReport}
          />
        )}

        {user.role === 'ADMIN_STAFF' && (
          <AdminPortal
            activeTab={activeTab}
            onOpenUniversityReport={handleOpenUniversityReport}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">AttendEASE365</span>
            <span>• Multi-Campus Attendance & Academic Compliance Platform</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <Database className="w-3 h-3" /> MongoDB Connected
            </span>
            <span>75% Compliance Engine</span>
            <span>Immutability & Audit Trail Active</span>
          </div>
        </div>
      </footer>

      {/* Official University Board Submission Modal */}
      {reportModalCourse && (
        <UniversityReportModal
          courseId={reportModalCourse.courseId}
          sectionId={reportModalCourse.sectionId}
          onClose={() => setReportModalCourse(null)}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
