import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService } from '@/lib/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');

    // In Next.js 15/16, cookies() is asynchronous
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('attendease_user_id')?.value;

    const userId = queryUserId || cookieUserId || 'user-faculty-1';

    const user = await dbService.getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      scope: {
        role: user.role,
        campusId: user.campusId,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
