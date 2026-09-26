import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
