import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { facultyId, records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid attendance records payload' },
        { status: 400 }
      );
    }

    const session = await dbService.submitAndLockSession(
      id,
      facultyId || 'user-faculty-1',
      records
    );

    return NextResponse.json({
      message: 'Attendance successfully submitted and locked.',
      session,
    });
  } catch (error) {
    const msg = (error as Error).message;
    const isLockedError = msg.includes('locked');
    return NextResponse.json(
      { error: msg },
      { status: isLockedError ? 423 : 400 }
    );
  }
}
