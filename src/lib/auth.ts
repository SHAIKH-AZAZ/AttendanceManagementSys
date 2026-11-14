import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import type { User, UserRole } from '@/types';

export const SESSION_COOKIE = 'attendease_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

// --- Session tokens: base64url({uid, exp}).hmac ---

declare global {
  // eslint-disable-next-line no-var
  var __attendease_dev_secret: string | undefined;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var must be set in production.');
  }
  // Dev only: random per server process, kept across hot reloads.
  return (globalThis.__attendease_dev_secret ??= randomBytes(32).toString('hex'));
}

const sign = (payload: string) =>
  createHmac('sha256', getSecret()).update(payload).digest('base64url');

export function createSessionToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): string | null {
  const [payload, sig] = token?.split('.') ?? [];
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof uid !== 'string' || typeof exp !== 'number') return null;
    return exp > Date.now() / 1000 ? uid : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_TTL_SECONDS,
};

// --- Request helpers ---

/** Never send password hashes to the client. */
export function toPublicUser(user: User): Omit<User, 'password'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = user;
  return rest;
}

/** Current user from the session cookie; re-checked against the DB so deactivation applies immediately. */
export async function getSessionUser(): Promise<User | null> {
  const uid = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!uid) return null;
  const user = await dbService.getUserById(uid);
  return user?.isActive ? user : null;
}

/**
 * Use at the top of every protected route handler:
 *   const auth = await requireUser('ADMIN_STAFF');
 *   if (auth instanceof NextResponse) return auth;
 * No roles = any signed-in user.
 */
export async function requireUser(...roles: UserRole[]): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  // HOD access is department-scoped; without a department it would be unscoped.
  if ((roles.length && !roles.includes(user.role)) || (user.role === 'HOD' && !user.departmentId)) {
    return NextResponse.json({ error: 'You do not have access to this resource.' }, { status: 403 });
  }
  return user;
}
