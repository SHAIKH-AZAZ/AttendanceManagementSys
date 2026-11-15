import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listNotifications, markRead } from '@/lib/services/notifications';

/** The signed-in user's latest notifications and unread count. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listNotifications(auth.id));
}

/** Mark notifications as read: `{ ids: [...] }`, or `{}` for all. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string').slice(0, 100) : undefined;
  await markRead(auth.id, ids);
  return NextResponse.json({ ok: true });
}
