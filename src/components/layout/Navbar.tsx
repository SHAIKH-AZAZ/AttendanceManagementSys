'use client';

import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { User, UserRole } from '@/types';
import { TABS } from '@/lib/navigation';
import { TOKENS } from '@/theme';
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

const initials = (name: string) =>
  name
    .replace(/^(Prof|Dr|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, activeTab, setActiveTab }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const role = ROLE_META[currentUser.role];
  const RoleIcon = role.icon;
  const tabs = TABS[currentUser.role];

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth={false} sx={{ maxWidth: 1280, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 64 }, justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: TOKENS.accentTint,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={20} />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>AttendEASE365</Typography>
          </Box>

          <ButtonBase
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={!!anchor}
            aria-label={`Account menu for ${currentUser.fullName}`}
            sx={{ borderRadius: 2, px: 1, py: 0.75, gap: 1.5, '&:hover': { bgcolor: TOKENS.fill } }}
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
            <ChevronDown size={16} color={TOKENS.steel} style={{ transform: anchor ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          </ButtonBase>

          <Menu
            anchorEl={anchor}
            open={!!anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { width: 288, mt: 1 } } }}
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
            {onLogout && <Divider />}
            {onLogout && (
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
            )}
          </Menu>
        </Toolbar>

        {/* Section tabs; scroll sideways on small screens and keep the active one in view */}
        <Tabs
          value={tabs.some((t) => t.id === activeTab) ? activeTab : false}
          onChange={(_, v: string) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons={false}
          aria-label="Sections"
          sx={{ mb: '-1px' }}
        >
          {tabs.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} sx={{ color: 'text.secondary' }} />
          ))}
        </Tabs>
      </Container>
    </AppBar>
  );
};
