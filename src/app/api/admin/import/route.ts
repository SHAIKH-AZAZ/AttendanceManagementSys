import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectionId, students, isPreviewOnly } = body;

    if (!sectionId || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Missing sectionId or student roster array' },
        { status: 400 }
      );
    }

    const sections = await dbService.getSections();
    const targetSection = sections.find((s) => s.id === sectionId);
    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const existingEnrollments = new Set(
      targetSection.enrolledStudents.map((s) => s.enrollmentNumber.trim().toUpperCase())
    );

    const validationReport = {
      totalRecords: students.length,
      validRecords: [] as { enrollmentNumber: string; fullName: string; email: string }[],
      duplicates: [] as { row: number; enrollmentNumber: string; reason: string }[],
      invalidRecords: [] as { row: number; data: unknown; reason: string }[],
    };

    const seenInBatch = new Set<string>();

    students.forEach((row, index) => {
      const rowNum = index + 1;
      const enroll = row.enrollmentNumber ? String(row.enrollmentNumber).trim().toUpperCase() : '';
      const name = row.fullName ? String(row.fullName).trim() : '';
      const email = row.email ? String(row.email).trim() : `${enroll.toLowerCase()}@univ.edu`;

      if (!enroll || !name) {
        validationReport.invalidRecords.push({
          row: rowNum,
          data: row,
          reason: !enroll ? 'Missing Enrollment Number' : 'Missing Student Name',
        });
        return;
      }

      if (existingEnrollments.has(enroll)) {
        validationReport.duplicates.push({
          row: rowNum,
          enrollmentNumber: enroll,
          reason: 'Enrollment Number already enrolled in this section',
        });
        return;
      }

      if (seenInBatch.has(enroll)) {
        validationReport.duplicates.push({
          row: rowNum,
          enrollmentNumber: enroll,
          reason: 'Duplicate Enrollment Number found within upload file',
        });
        return;
      }

      seenInBatch.add(enroll);
      validationReport.validRecords.push({
        enrollmentNumber: enroll,
        fullName: name,
        email,
      });
    });

    if (isPreviewOnly) {
      return NextResponse.json({
        preview: true,
        totalRecords: validationReport.totalRecords,
        validCount: validationReport.validRecords.length,
        duplicateCount: validationReport.duplicates.length,
        invalidCount: validationReport.invalidRecords.length,
        duplicates: validationReport.duplicates,
        invalidRecords: validationReport.invalidRecords,
        sampleValid: validationReport.validRecords.slice(0, 5),
      });
    }

    // Commit import
    const commitResult = await dbService.importStudentsRoster(
      sectionId,
      validationReport.validRecords
    );

    return NextResponse.json({
      success: true,
      message: `Roster import committed successfully into ${targetSection.name}.`,
      summary: {
        totalRecords: validationReport.totalRecords,
        successfullyImported: commitResult.successfullyImported,
        duplicates: validationReport.duplicates.length,
        invalidRecords: validationReport.invalidRecords.length,
      },
      duplicates: validationReport.duplicates,
      invalidRecords: validationReport.invalidRecords,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
