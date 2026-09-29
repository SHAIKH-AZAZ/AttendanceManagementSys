import { NextResponse } from 'next/server';
import { dbService, publicUser } from '@/lib/db-service';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json(
        { error: 'Enter your email address and password.' },
        { status: 400 }
      );
    }

    const { user, token } = await dbService.authenticate(email, password);

    const response = NextResponse.json({
      message: 'Login successful',
      user: publicUser(user),
      token,
    });

    // ponytail: the cookie holds a plain user id; replace with a signed session before real deployment.
    response.cookies.set('attendease_user_id', user.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 401 }
    );
  }
}
