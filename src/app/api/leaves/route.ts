import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || undefined;
    const departmentId = searchParams.get('departmentId') || undefined;
    const status = searchParams.get('status') || undefined;

    const leaves = await dbService.getLeaves({
      studentId,
      departmentId,
      status,
    });

    return NextResponse.json({ leaves });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId,
      studentName,
      enrollmentNumber,
      campusId,
      departmentId,
      leaveType,
      startDate,
      endDate,
      reason,
      documentUrl,
    } = body;

    if (!studentId || !startDate || !endDate || !reason || !leaveType) {
      return NextResponse.json(
        { error: 'Missing required leave fields' },
        { status: 400 }
      );
    }

    const leave = await dbService.submitLeave({
      studentId,
      studentName: studentName || 'Student',
      enrollmentNumber: enrollmentNumber || 'ENR-UNKNOWN',
      campusId: campusId || 'campus-1',
      departmentId: departmentId || 'dept-cs',
      leaveType,
      startDate,
      endDate,
      reason,
      documentUrl: documentUrl || '/documents/sample_leave_proof.pdf',
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
