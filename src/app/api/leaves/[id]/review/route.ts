import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser('HOD');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reviewComments } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    const leave = (await dbService.getLeaves()).find((l) => l.id === id);
    if (!leave) {
      return NextResponse.json({ error: 'Leave application not found' }, { status: 404 });
    }
    if (leave.departmentId !== auth.departmentId) {
      return NextResponse.json({ error: 'Leave belongs to another department.' }, { status: 403 });
    }

    const result = await dbService.reviewLeave(
      id,
      auth.id,
      status,
      reviewComments || `Leave ${status.toLowerCase()} by HOD.`
    );

    return NextResponse.json({
      message: `Leave ${status.toLowerCase()} successfully. ${result.updatedSessionCount} attendance records updated.`,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
