import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
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
