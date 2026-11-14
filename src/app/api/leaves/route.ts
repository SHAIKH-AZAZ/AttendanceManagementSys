import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';

export async function GET(request: Request) {
  const auth = await requireUser('STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { searchParams } = new URL(request.url);
    // Students: own leaves only. HODs: own department only.
    const studentId =
      auth.role === 'STUDENT' ? auth.id : searchParams.get('studentId') || undefined;
    const departmentId =
      auth.role === 'HOD' ? auth.departmentId : searchParams.get('departmentId') || undefined;
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
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await request.json();
    // Identity comes from the session, never from the request body.
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      documentUrl,
    } = body;

    if (!startDate || !endDate || !reason || !leaveType) {
      return NextResponse.json(
        { error: 'Missing required leave fields' },
        { status: 400 }
      );
    }

    const leave = await dbService.submitLeave({
      studentId: auth.id,
      studentName: auth.fullName,
      enrollmentNumber: auth.studentProfile?.enrollmentNumber || 'ENR-UNKNOWN',
      campusId: auth.campusId,
      departmentId: auth.departmentId || 'dept-cs',
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
