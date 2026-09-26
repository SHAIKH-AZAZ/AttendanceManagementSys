import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(request: Request) {
  try {
    const response = NextResponse.json({
      message: 'Logged out successfully',
      success: true,
    });

    response.cookies.set('attendease_user_id', '', {
      path: '/',
      maxAge: 0,
    });

    dbService.addSystemAudit({
      userId: 'system',
      userName: 'User Session',
      action: 'USER_LOGOUT',
      entityName: 'Session',
      entityId: 'current',
      details: 'User logged out of AttendEASE365 portal.',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
