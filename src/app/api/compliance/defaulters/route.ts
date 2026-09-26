import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || 'course-ds';
    const sectionId = searchParams.get('sectionId') || 'sec-ds-a';

    const stats = await dbService.getComplianceStats(courseId, sectionId);
    const defaulters = stats.filter((s) => s.isDefaulter);

    return NextResponse.json({
      totalStudents: stats.length,
      defaulterCount: defaulters.length,
      complianceRate:
        stats.length > 0
          ? Number((((stats.length - defaulters.length) / stats.length) * 100).toFixed(1))
          : 100,
      stats,
      defaulters,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
