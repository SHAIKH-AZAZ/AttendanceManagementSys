'use client';

import React from 'react';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { NavIcon } from '@astryxdesign/core/NavIcon';
import { Icon } from '@astryxdesign/core/Icon';
import { Avatar } from '@astryxdesign/core/Avatar';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileUp,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  NotebookPen,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { User, UserRole } from '@/types';
import { TABS } from '@/lib/navigation';
import { NotificationBell } from './NotificationBell';

const ROLE_META: Record<UserRole, { label: string; icon: LucideIcon }> = {
  FACULTY: { label: 'Faculty', icon: BookOpen },
  STUDENT: { label: 'Student', icon: GraduationCap },
  HOD: { label: 'Head of department', icon: ShieldCheck },
  ADMIN_STAFF: { label: 'Admin staff', icon: UserCog },
};

/** Sidebar icon per section; the section list itself comes from TABS. */
const TAB_ICONS: Record<string, LucideIcon> = {
  'faculty-overview': LayoutDashboard,
  'faculty-attendance': ClipboardCheck,
  'faculty-sessions': History,
  'faculty-marks': NotebookPen,
  'faculty-assignments': ClipboardList,
  'faculty-schedule': CalendarDays,
  'faculty-defaulters': TriangleAlert,
  'student-overview': LayoutDashboard,
  'student-history': History,
  'student-marks': NotebookPen,
  'student-assignments': ClipboardList,
  'student-schedule': CalendarDays,
  'student-leaves': FileText,
  'student-fees': Wallet,
  'hod-overview': LayoutDashboard,
  'hod-leaves': ListChecks,
  'hod-marks': NotebookPen,
  'hod-defaulters': TriangleAlert,
  'hod-allocation': Network,
  'hod-schedule': CalendarDays,
  'hod-reports': BarChart3,
  'admin-overview': LayoutDashboard,
  'admin-users': Users,
  'admin-structure': Network,
  'admin-schedule': CalendarDays,
  'admin-fees': Wallet,
  'admin-import': FileUp,
  'admin-reports': BarChart3,
  'admin-audit': History,
};

interface NavProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AppTopNav({ currentUser, onLogout, setActiveTab }: NavProps & { onLogout: () => void }) {
  const role = ROLE_META[currentUser.role];
  // Phones: avatar only, so the name doesn't squeeze the app name out of the bar.
  const isNarrow = useMediaQuery('(max-width: 640px)');
  return (
    <TopNav
      label="Main navigation"
      heading={
        <TopNavHeading
          heading="AttendEASE365"
          logo={<NavIcon icon={<Icon icon={GraduationCap} size="sm" />} />}
        />
      }
      endContent={
        <>
          <NotificationBell onOpenTab={setActiveTab} />
          <DropdownMenu
            alignment="end"
            hasChevron={!isNarrow}
            menuWidth={280}
            button={{
              label: currentUser.fullName,
              variant: 'ghost',
              isIconOnly: isNarrow,
              icon: <Avatar name={currentUser.fullName} size="sm" tooltip={false} />,
            }}
            header={
              <VStack gap={0.5} padding={2}>
                <Text weight="semibold" maxLines={1}>
                  {currentUser.fullName}
                </Text>
                <Text type="supporting" color="secondary" maxLines={1}>
                  {currentUser.email}
                </Text>
                <Text type="supporting" color="accent" weight="semibold">
                  {role.label}
                </Text>
              </VStack>
            }
            items={[{ label: 'Sign out', icon: LogOut, variant: 'destructive', onClick: onLogout }]}
          />
        </>
      }
    />
  );
}

export function AppSideNav({ currentUser, activeTab, setActiveTab }: NavProps) {
  const role = ROLE_META[currentUser.role];
  return (
    <SideNav
      aria-label="Sections"
      footer={
        <Text type="supporting" color="secondary">
          Locked sessions · 75% threshold · Audit trail
        </Text>
      }
    >
      <SideNavSection title={role.label}>
        {TABS[currentUser.role].map((t) => (
          <SideNavItem
            key={t.id}
            label={t.label}
            icon={TAB_ICONS[t.id]}
            isSelected={t.id === activeTab}
            onClick={() => setActiveTab(t.id)}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}
