import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { SESSION_COOKIE, getSessionUser, sessionCookieOptions } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();

  const response = NextResponse.json({ message: 'Logged out successfully', success: true });
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });

  if (user) {
    dbService.addSystemAudit({
      userId: user.id,
      userName: user.fullName,
      action: 'USER_LOGOUT',
      entityName: 'Session',
      entityId: user.id,
      details: "Signed out.",
    });
  }

  return response;
}
