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
    const records = await dbService.copyPreviousSession(id);

    return NextResponse.json({
      message: 'Copied student attendance from previous completed session.',
      records,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
