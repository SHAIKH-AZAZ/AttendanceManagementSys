import { NextResponse } from 'next/server';
import { dbService, publicUser } from '@/lib/db-service';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only account status is editable from the admin UI; never accept ids, roles or passwords here.
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }
    const updatedUser = await dbService.updateUser(id, { isActive: body.isActive });

    return NextResponse.json({
      message: 'User updated successfully.',
      user: publicUser(updatedUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await dbService.deleteUser(id);

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
