import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid attendance records payload' },
        { status: 400 }
      );
    }

    const session = await dbService.saveDraftAttendance(id, records);
    return NextResponse.json({
      message: 'Draft attendance saved.',
      session,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
