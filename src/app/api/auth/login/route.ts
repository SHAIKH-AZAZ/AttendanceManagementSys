import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  toPublicUser,
} from '@/lib/auth';

export async function POST(request: Request) {
  let email: unknown, password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    const user = await dbService.authenticate(email, password);
    const response = NextResponse.json({ message: 'Login successful', user: toPublicUser(user) });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), sessionCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
}
