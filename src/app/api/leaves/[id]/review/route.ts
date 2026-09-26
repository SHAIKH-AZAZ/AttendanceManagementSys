import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { hodUserId, status, reviewComments } = body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    const result = await dbService.reviewLeave(
      id,
      hodUserId || 'user-hod-1',
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
