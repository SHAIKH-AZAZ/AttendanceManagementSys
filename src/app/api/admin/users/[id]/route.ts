import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser, toPublicUser } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 8)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (id === auth.id && (body.isActive === false || (body.role && body.role !== auth.role))) {
      return NextResponse.json({ error: 'You cannot deactivate or demote your own account.' }, { status: 400 });
    }

    const updatedUser = await dbService.updateUser(id, body, auth);

    return NextResponse.json({
      message: 'User updated successfully.',
      user: toPublicUser(updatedUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    if (id === auth.id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    const result = await dbService.deleteUser(id, auth);

    return NextResponse.json({
      message: 'User account deactivated.',
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
