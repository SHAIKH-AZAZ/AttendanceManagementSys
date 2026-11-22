'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Popover } from '@astryxdesign/core/Popover';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Icon } from '@astryxdesign/core/Icon';
import { List, ListItem } from '@astryxdesign/core/List';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Text } from '@astryxdesign/core/Text';
import { Bell, Dot } from 'lucide-react';
import type { AppNotification } from '@/types';

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
  const [isOpen, setIsOpen] = useState(false);
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
    <Popover
      label="Notifications"
      placement="below"
      alignment="end"
      width={340}
      padding={0}
      isOpen={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) load();
      }}
      content={
        <VStack>
          <HStack padding={3} gap={2} vAlign="center" hAlign="between">
            <Text weight="semibold">Notifications</Text>
            {unread > 0 && <Button label="Mark all read" size="sm" variant="ghost" onClick={() => markRead()} />}
          </HStack>
          {items.length === 0 ? (
            <VStack padding={4} hAlign="center">
              <Text color="secondary">Nothing yet.</Text>
            </VStack>
          ) : (
            <List hasDividers density="compact">
              {items.map((n) => (
                <ListItem
                  key={n.id}
                  align="first-line"
                  startContent={<Icon icon={Dot} size="md" color={n.readAt ? 'disabled' : 'accent'} />}
                  label={<Text weight={n.readAt ? 'normal' : 'semibold'}>{n.title}</Text>}
                  description={
                    <VStack gap={0.5}>
                      <Text type="supporting" color="secondary">
                        {n.body}
                      </Text>
                      <Text type="supporting" color="disabled">
                        {timeAgo(n.createdAt)}
                      </Text>
                    </VStack>
                  }
                  onClick={() => {
                    setIsOpen(false);
                    if (!n.readAt) markRead([n.id]);
                    if (n.tab) onOpenTab(n.tab);
                  }}
                />
              ))}
            </List>
          )}
        </VStack>
      }
    >
      <Button
        label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        variant="ghost"
        icon={<Icon icon={Bell} />}
        isIconOnly={!unread}
        endContent={unread ? <Badge variant="error" label={unread > 99 ? '99+' : String(unread)} /> : undefined}
      >
        {unread ? '' : undefined}
      </Button>
    </Popover>
  );
}
