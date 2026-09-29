import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService } from '@/lib/db-service';

export async function POST() {
  try {
    const userId = (await cookies()).get('attendease_user_id')?.value;
    const user = userId ? await dbService.getUserById(userId) : undefined;

    const response = NextResponse.json({
      message: 'Logged out successfully',
      success: true,
    });

    response.cookies.set('attendease_user_id', '', {
      path: '/',
      maxAge: 0,
    });

    if (user) {
      dbService.addSystemAudit({
        userId: user.id,
        userName: user.fullName,
        action: 'USER_LOGOUT',
        entityName: 'User',
        entityId: user.id,
        details: `${user.fullName} signed out.`,
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
