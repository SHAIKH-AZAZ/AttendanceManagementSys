import type { UserRole } from '@/types';

/** Single source of truth for each role's sections. The first tab is the landing page. */
export const TABS: Record<UserRole, { id: string; label: string }[]> = {
  FACULTY: [
    { id: 'faculty-overview', label: 'Overview' },
    { id: 'faculty-attendance', label: 'Take attendance' },
    { id: 'faculty-sessions', label: 'Sessions' },
    { id: 'faculty-marks', label: 'Marks' },
    { id: 'faculty-assignments', label: 'Assignments' },
    { id: 'faculty-schedule', label: 'Schedule' },
    { id: 'faculty-defaulters', label: 'Defaulters' },
  ],
  STUDENT: [
    { id: 'student-overview', label: 'Overview' },
    { id: 'student-history', label: 'Lecture history' },
    { id: 'student-marks', label: 'Marks' },
    { id: 'student-assignments', label: 'Assignments' },
    { id: 'student-schedule', label: 'Schedule' },
    { id: 'student-leaves', label: 'Leave' },
    { id: 'student-fees', label: 'Fees' },
  ],
  HOD: [
    { id: 'hod-overview', label: 'Overview' },
    { id: 'hod-leaves', label: 'Leave approvals' },
    { id: 'hod-marks', label: 'Marks review' },
    { id: 'hod-defaulters', label: 'Defaulters' },
    { id: 'hod-allocation', label: 'Allocation' },
    { id: 'hod-schedule', label: 'Schedule' },
    { id: 'hod-reports', label: 'Reports' },
  ],
  ADMIN_STAFF: [
    { id: 'admin-overview', label: 'Overview' },
    { id: 'admin-users', label: 'Users' },
    { id: 'admin-structure', label: 'Academic structure' },
    { id: 'admin-schedule', label: 'Exams & calendar' },
    { id: 'admin-fees', label: 'Fees' },
    { id: 'admin-import', label: 'Bulk import' },
    { id: 'admin-reports', label: 'Reports' },
    { id: 'admin-audit', label: 'Audit log' },
  ],
};

export const defaultTab = (role: UserRole) => TABS[role][0].id;

/** Props every role portal receives from the app shell. */
export interface PortalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenUniversityReport: (courseId: string, sectionId: string) => void;
}
