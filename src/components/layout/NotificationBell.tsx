'use client';

import React, { useCallback, useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import MuiBadge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import { Bell } from 'lucide-react';
import type { AppNotification } from '@/types';
import { TOKENS } from '@/theme';

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** Bell with unread count; lists the latest notifications and opens the related tab. */
export function NotificationBell({ onOpenTab }: { onOpenTab: (tab: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const res = await fetch('/api/notifications');
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items ?? []);
    setUnread(data.unread ?? 0);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const markRead = async (ids?: string[]) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids ? { ids } : {}),
    });
    load();
  };

  return (
    <>
      <IconButton
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onClick={(e) => {
          setAnchor(e.currentTarget);
          load();
        }}
        sx={{ color: 'text.secondary' }}
      >
        <MuiBadge badgeContent={unread} color="error" max={99}>
          <Bell size={20} />
        </MuiBadge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: 'calc(100vw - 24px)', mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unread > 0 && (
            <Button size="small" onClick={() => markRead()}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            Nothing yet.
          </Typography>
        ) : (
          items.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => {
                setAnchor(null);
                if (!n.readAt) markRead([n.id]);
                if (n.tab) onOpenTab(n.tab);
              }}
              sx={{ alignItems: 'flex-start', gap: 1.25, whiteSpace: 'normal', py: 1.25, bgcolor: n.readAt ? undefined : TOKENS.accentTint + '66' }}
            >
              <Box
                aria-hidden="true"
                sx={{ mt: 0.75, width: 8, height: 8, borderRadius: 4, flexShrink: 0, bgcolor: n.readAt ? 'transparent' : 'primary.main' }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {n.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                  {n.body}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {timeAgo(n.createdAt)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}
