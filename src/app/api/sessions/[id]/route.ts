import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const session = await dbService.getSessionById(id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (auth.role === 'FACULTY' && session.facultyId !== auth.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
