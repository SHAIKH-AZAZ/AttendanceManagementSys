import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function GET() {
  try {
    const logs = await dbService.getSystemAuditLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
