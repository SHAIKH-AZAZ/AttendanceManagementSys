'use client';

import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FileUp,
  GraduationCap,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
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
import { TOKENS } from '@/theme';
import { NotificationBell } from './NotificationBell';

const BAR_HEIGHT = 64;
const NAV_WIDTH = 248;

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

const initials = (name: string) =>
  name
    .replace(/^(Prof|Dr|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

interface AppShellProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

/**
 * Signed-in frame: top bar (app name, notifications, account menu), the role's
 * sections in a sidebar (a slide-out drawer below `md`), and the page content.
 * The window scrolls, not an inner panel, so sticky elements in portals keep working.
 */
export function AppShell({ currentUser, onLogout, activeTab, setActiveTab, children }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const role = ROLE_META[currentUser.role];

  const sections = (
    <Box component="nav" aria-label="Sections" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <List
        sx={{ px: 1, py: 1.5 }}
        subheader={
          <ListSubheader disableSticky sx={{ lineHeight: 2.5, bgcolor: 'transparent', fontSize: '0.75rem' }}>
            {role.label}
          </ListSubheader>
        }
      >
        {TABS[currentUser.role].map((t) => {
          const Icon = TAB_ICONS[t.id] ?? LayoutDashboard;
          const selected = t.id === activeTab;
          return (
            <ListItemButton
              key={t.id}
              selected={selected}
              aria-current={selected ? 'page' : undefined}
              onClick={() => {
                setActiveTab(t.id);
                setNavOpen(false);
              }}
            >
              <ListItemIcon>
                <Icon size={18} />
              </ListItemIcon>
              <ListItemText primary={t.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', px: 3, py: 2 }}>
        Locked sessions · 75% threshold · Audit trail
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: { xs: BAR_HEIGHT }, gap: 1, px: { xs: 1.5, sm: 2.5 } }}>
          <IconButton
            aria-label="Open sections"
            aria-expanded={navOpen}
            onClick={() => setNavOpen(true)}
            sx={{ display: { md: 'none' }, color: 'text.secondary' }}
          >
            <MenuIcon size={20} />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={20} />
            </Box>
            <Typography noWrap sx={{ fontWeight: 700, fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>
              AttendEASE365
            </Typography>
          </Box>

          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <NotificationBell onOpenTab={setActiveTab} />
            <AccountMenu currentUser={currentUser} onLogout={onLogout} />
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flex: 1, minWidth: 0 }}>
        {/* Phones and tablets: slide-out drawer */}
        <Drawer
          variant="temporary"
          open={navOpen}
          onClose={() => setNavOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { md: 'none' } }}
          slotProps={{ paper: { sx: { width: NAV_WIDTH + 32 } } }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, minHeight: BAR_HEIGHT, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ fontWeight: 700 }}>AttendEASE365</Typography>
          </Box>
          {sections}
        </Drawer>

        {/* Desktop: sidebar that stays below the top bar while the page scrolls */}
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', md: 'block' }, width: NAV_WIDTH, flexShrink: 0 }}
          slotProps={{
            paper: {
              sx: {
                width: NAV_WIDTH,
                position: 'sticky',
                top: BAR_HEIGHT,
                height: `calc(100dvh - ${BAR_HEIGHT}px)`,
                bgcolor: 'background.default',
                borderColor: 'divider',
              },
            },
          }}
        >
          {sections}
        </Drawer>

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 3, sm: 4 } }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}

function AccountMenu({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const role = ROLE_META[currentUser.role];
  const RoleIcon = role.icon;

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        aria-label={`Account menu for ${currentUser.fullName}`}
        sx={{ borderRadius: 2, px: { xs: 0.5, sm: 1 }, py: 0.75, gap: 1.25, '&:hover': { bgcolor: TOKENS.fill } }}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 700, bgcolor: TOKENS.accentTint, color: 'primary.dark' }}>
          {initials(currentUser.fullName)}
        </Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', lineHeight: 1.2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {currentUser.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {role.label}
          </Typography>
        </Box>
        <Box
          component={ChevronDown}
          size={16}
          sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.disabled', transition: 'transform .15s', transform: anchor ? 'rotate(180deg)' : undefined }}
        />
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 288, maxWidth: 'calc(100vw - 24px)', mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: TOKENS.accentTint,
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <RoleIcon size={20} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {currentUser.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {currentUser.email}
            </Typography>
            <Typography variant="caption" color="primary.dark" sx={{ fontWeight: 600 }}>
              {role.label}
            </Typography>
          </Box>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            onLogout();
          }}
          sx={{ color: 'error.main', fontWeight: 600, mt: 0.5 }}
        >
          <ListItemIcon sx={{ color: 'inherit' }}>
            <LogOut size={16} />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
