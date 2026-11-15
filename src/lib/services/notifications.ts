import { randomBytes } from 'node:crypto';
import type { AppNotification } from '@/types';
import { NotificationModel } from '@/models';
import { connectToDatabase } from '../mongodb';

const newId = () => `ntf-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;

/** Send the same in-app notification to several users. */
export async function notify(userIds: string[], n: { title: string; body: string; tab?: string }) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;
  await connectToDatabase();
  const createdAt = new Date().toISOString();
  await NotificationModel.insertMany(unique.map((userId) => ({ _id: newId(), userId, ...n, createdAt })));
}

export async function listNotifications(userId: string, limit = 30): Promise<{ items: AppNotification[]; unread: number }> {
  await connectToDatabase();
  const [docs, unread] = await Promise.all([
    NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    NotificationModel.countDocuments({ userId, readAt: { $exists: false } }),
  ]);
  return { items: docs.map(({ _id, ...rest }) => ({ id: _id, ...rest })), unread };
}

/** Mark the given notifications (or all, when ids is omitted) as read — only the user's own. */
export async function markRead(userId: string, ids?: string[]) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { userId, readAt: { $exists: false } };
  if (ids?.length) filter._id = { $in: ids };
  await NotificationModel.updateMany(filter, { $set: { readAt: new Date().toISOString() } });
}
