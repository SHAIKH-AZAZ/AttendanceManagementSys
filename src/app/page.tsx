'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AcademicMeta, User, UserRole } from '@/types';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useApi } from '@/lib/client';
import { LoadState, Spinner, ToastProvider } from '@/components/ui';
import { LoginPage } from '@/components/auth/LoginPage';
import { Navbar, type NavItem } from '@/components/layout/Navbar';
import { FacultyPortal } from '@/components/faculty/FacultyPortal';
import { StudentPortal } from '@/components/student/StudentPortal';
import { HODPortal } from '@/components/hod/HODPortal';
import { AdminPortal } from '@/components/admin/AdminPortal';
import { UniversityReportModal } from '@/components/reports/UniversityReportModal';

// The first entry is each role's landing view.
const NAV: Record<UserRole, NavItem[]> = {
  FACULTY: [
    { id: 'attendance', label: 'Mark attendance' },
    { id: 'sessions', label: 'Session history' },
    { id: 'compliance', label: 'Compliance' },
  ],
  STUDENT: [
    { id: 'overview', label: 'My attendance' },
    { id: 'leave', label: 'Leave applications' },
  ],
  HOD: [
    { id: 'overview', label: 'Department overview' },
    { id: 'leave', label: 'Leave requests' },
    { id: 'defaulters', label: 'Defaulters' },
  ],
  ADMIN_STAFF: [
    { id: 'structure', label: 'Academic structure' },
    { id: 'import', label: 'Roster import' },
    { id: 'reports', label: 'Reports' },
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit log' },
  ],
};

export default function Home() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<SessionCheck />}>
          <App />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
}

function SessionCheck() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-600">
      <Spinner className="text-brand-700" /> Checking your session…
    </div>
  );
}

function App() {
  const { user, status } = useAuth();
  if (status === 'loading') return <SessionCheck />;
  return user ? <Workspace user={user} /> : <LoginPage />;
}

function Workspace({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const meta = useApi<AcademicMeta>('/api/meta');
  const [report, setReport] = useState<{ courseId: string; sectionId: string } | null>(null);

  const items = NAV[user.role];
  const current = items.find((item) => item.id === searchParams.get('view')) ?? items[0];
  const view = current.id;
  // pushState is picked up by useSearchParams, so views get history entries and deep links.
  const navigate = (id: string) => window.history.pushState(null, '', `?view=${id}`);
  const openReport = (courseId: string, sectionId: string) => setReport({ courseId, sectionId });

  useEffect(() => {
    document.title = `${current.label} | AttendEASE365`;
  }, [current.label]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={user} meta={meta.data} items={items} active={view} onNavigate={navigate} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8">
        {!meta.data ? (
          <LoadState error={meta.error} onRetry={meta.reload} />
        ) : user.role === 'FACULTY' ? (
          <FacultyPortal user={user} meta={meta.data} view={view} onNavigate={navigate} onOpenReport={openReport} />
        ) : user.role === 'STUDENT' ? (
          <StudentPortal user={user} meta={meta.data} view={view} />
        ) : user.role === 'HOD' ? (
          <HODPortal user={user} meta={meta.data} view={view} onOpenReport={openReport} />
        ) : (
          <AdminPortal meta={meta.data} reloadMeta={meta.reload} view={view} onOpenReport={openReport} />
        )}
      </main>
      {report && <UniversityReportModal {...report} onClose={() => setReport(null)} />}
    </div>
  );
}
