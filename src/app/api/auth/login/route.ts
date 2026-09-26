import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const ssoRole = body.ssoRole || body.role;

    let targetEmail = email;

    // Support 1-click SSO simulation by role
    if (ssoRole) {
      const users = await dbService.getUsers();
      const ssoUser = users.find((u) => u.role === ssoRole);
      if (ssoUser) {
        targetEmail = ssoUser.email;
      }
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Email or valid SSO role is required' },
        { status: 400 }
      );
    }

    const { user, token } = await dbService.authenticate(targetEmail, password);

    const response = NextResponse.json({
      message: 'Login successful',
      user,
      token,
    });

    // Set user session cookie (accessible to client and server)
    response.cookies.set('attendease_user_id', user.id, {
      path: '/',
      httpOnly: false, // allow client context to sync state cleanly
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
