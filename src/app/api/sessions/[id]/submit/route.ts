import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('FACULTY');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const owned = await dbService.getSessionById(id);
    if (!owned) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (owned.facultyId !== auth.id) {
      return NextResponse.json({ error: 'You can only modify your own sessions.' }, { status: 403 });
    }
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Invalid attendance records payload' },
        { status: 400 }
      );
    }

    const session = await dbService.submitAndLockSession(
      id,
      auth.id,
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
