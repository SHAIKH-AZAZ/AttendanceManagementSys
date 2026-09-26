import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedUser = await dbService.updateUser(id, body);

    return NextResponse.json({
      message: 'User updated successfully.',
      user: updatedUser,
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
