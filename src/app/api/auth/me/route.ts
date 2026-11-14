import { NextResponse } from 'next/server';
import { requireUser, toPublicUser } from '@/lib/auth';

export async function GET() {
  const user = await requireUser();
  if (user instanceof NextResponse) return user;

  return NextResponse.json({
    user: toPublicUser(user),
    scope: {
      role: user.role,
      campusId: user.campusId,
      departmentId: user.departmentId,
    },
  });
}
