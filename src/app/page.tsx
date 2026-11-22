'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { AppShell } from '@astryxdesign/core/AppShell';
import { VStack } from '@astryxdesign/core/VStack';
import { Spinner } from '@astryxdesign/core/Spinner';
import { AppSideNav, AppTopNav } from '@/components/layout/Navbar';
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
      <VStack as="output" minHeight="100dvh" hAlign="center" vAlign="center">
        <Spinner size="lg" label="Loading your session…" />
      </VStack>
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

  const nav = { currentUser: user, activeTab, setActiveTab };

  return (
    <AppShell contentPadding={6} topNav={<AppTopNav {...nav} onLogout={logout} />} sideNav={<AppSideNav {...nav} />}>
      {user.role === 'FACULTY' && <FacultyPortal {...portalProps} />}
      {user.role === 'STUDENT' && <StudentPortal {...portalProps} />}
      {user.role === 'HOD' && <HODPortal {...portalProps} />}
      {user.role === 'ADMIN_STAFF' && <AdminPortal {...portalProps} />}

      {/* Official University Board Submission Modal */}
      {reportModalCourse && (
        <UniversityReportModal
          courseId={reportModalCourse.courseId}
          sectionId={reportModalCourse.sectionId}
          onClose={() => setReportModalCourse(null)}
        />
      )}
    </AppShell>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
