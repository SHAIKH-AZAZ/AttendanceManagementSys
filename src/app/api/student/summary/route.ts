import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireUser('STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    // Students can only ever see their own record.
    const studentId =
      auth.role === 'STUDENT' ? auth.id : searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }

    const summary = await dbService.getStudentPersonalSummary(studentId);
    const leaves = await dbService.getLeaves({ studentId });

    return NextResponse.json({
      summary,
      leaves,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
