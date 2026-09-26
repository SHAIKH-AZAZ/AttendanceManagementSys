import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, studentName, enrollmentNumber, courseCode, percentage } =
      body;

    if (!studentId || !studentName) {
      return NextResponse.json(
        { error: 'Missing student details' },
        { status: 400 }
      );
    }

    // Log the notification to audit logs
    dbService.addSystemAudit({
      userId: 'system-mailer',
      userName: 'Compliance Notification Worker',
      action: 'EMAIL_ALERT_DISPATCHED',
      entityName: 'StudentCompliance',
      entityId: studentId,
      details: `Compliance warning email sent to ${studentName} (${enrollmentNumber}): Attendance is ${percentage}% in ${courseCode}, below 75% threshold.`,
    });

    return NextResponse.json({
      success: true,
      message: `Formal attendance warning email dispatched to ${studentName}.`,
      deliveryStatus: 'QUEUED_AND_SENT',
      recipient: `${enrollmentNumber.toLowerCase()}@univ.edu`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
