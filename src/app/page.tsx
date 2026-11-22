'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Navbar } from '@/components/layout/Navbar';
import { FacultyPortal } from '@/components/faculty/FacultyPortal';
import { StudentPortal } from '@/components/student/StudentPortal';
import { HODPortal } from '@/components/hod/HODPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { UniversityReportModal } from '@/components/reports/UniversityReportModal';
import { defaultTab, TABS } from '@/lib/navigation';

function DashboardContent() {
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('');
  const [reportModalCourse, setReportModalCourse] = useState<{
    courseId: string;
    sectionId: string;
  } | null>(null);

  // Land on the role's first section whenever the signed-in role changes, or on
  // ?tab= when it names one of this role's sections (payment gateways return to the Fees tab).
  const role = user?.role;
  useEffect(() => {
    if (!role) return;
    const wanted = new URLSearchParams(window.location.search).get('tab');
    setActiveTab(wanted && TABS[role].some((t) => t.id === wanted) ? wanted : defaultTab(role));
  }, [role]);

  if (isLoading) {
    return (
      <output className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          <p className="text-sm text-slate-500">Loading your session…</p>
        </div>
      </output>
    );
  }

  // If not authenticated, render LoginPage
  if (!user) {
    return <LoginPage />;
  }

  const handleOpenUniversityReport = (courseId: string, sectionId: string) => {
    setReportModalCourse({ courseId, sectionId });
  };

  const portalProps = {
    activeTab,
    setActiveTab,
    onOpenUniversityReport: handleOpenUniversityReport,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar with onLogout */}
      <Navbar
        currentUser={user}
        onLogout={logout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {user.role === 'FACULTY' && (
          <FacultyPortal {...portalProps} />
        )}

        {user.role === 'STUDENT' && (
          <StudentPortal {...portalProps} />
        )}

        {user.role === 'HOD' && (
          <HODPortal {...portalProps} />
        )}

        {user.role === 'ADMIN_STAFF' && (
          <AdminPortal {...portalProps} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-2xs text-slate-500">
          <span>
            <span className="font-semibold text-slate-700">AttendEASE365</span> · Attendance and academic compliance
          </span>
          <span>Locked sessions · 75% threshold · Audit trail</span>
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
