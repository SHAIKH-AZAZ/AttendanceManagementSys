import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dbService, publicUser } from '@/lib/db-service';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('attendease_user_id')?.value;
    const user = userId ? await dbService.getUserById(userId) : undefined;

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    return NextResponse.json({
      user: publicUser(user),
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
