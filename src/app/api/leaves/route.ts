import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
import { requireUser } from '@/lib/auth';
import { getFileMeta } from '@/lib/services/files';
import { fileUrl } from '@/lib/services/file-access';
import { notify } from '@/lib/services/notifications';

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
      fileId,
    } = body;

    if (!startDate || !endDate || !reason || !leaveType) {
      return NextResponse.json(
        { error: 'Missing required leave fields' },
        { status: 400 }
      );
    }
    const isDate = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (!['CASUAL', 'MEDICAL', 'ON_DUTY', 'BEREAVEMENT'].includes(leaveType)) {
      return NextResponse.json({ error: 'Unknown leave type.' }, { status: 400 });
    }
    if (!isDate(startDate) || !isDate(endDate) || endDate < startDate) {
      return NextResponse.json({ error: 'End date must be on or after the start date.' }, { status: 400 });
    }
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 500) {
      return NextResponse.json({ error: 'Give a reason (up to 500 characters).' }, { status: 400 });
    }

    // Proof must be a file this student uploaded for leave; never a free-form link.
    let documentUrl: string | undefined;
    if (fileId !== undefined && fileId !== null && fileId !== '') {
      const meta = typeof fileId === 'string' ? await getFileMeta(fileId) : null;
      if (!meta || meta.ownerId !== auth.id || meta.purpose !== 'LEAVE_PROOF') {
        return NextResponse.json({ error: 'Attach the proof again; the upload was not found.' }, { status: 400 });
      }
      documentUrl = fileUrl(meta.id);
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
      documentUrl,
    });

    const hods = (await dbService.getUsers()).filter((u) => u.role === 'HOD' && u.isActive && u.departmentId === leave.departmentId);
    await notify(
      hods.map((h) => h.id),
      { title: 'New leave request', body: `${leave.studentName} · ${leave.leaveType.toLowerCase().replace('_', ' ')} · ${leave.startDate} to ${leave.endDate}`, tab: 'hod-leaves' }
    );
    return NextResponse.json({ leave }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
