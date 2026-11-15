import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { dbService } from '@/lib/db-service';
import { createCourse } from '@/lib/services/structure';

/** Admin: add a subject, e.g. { code: "BE05000171", title: "CN", credits: 4, departmentId }. */
export async function POST(request: Request) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { code, title, credits, departmentId } = await request.json();
    if (typeof code !== 'string' || !code.trim() || code.length > 30) {
      return NextResponse.json({ error: 'Enter the subject code (up to 30 characters).' }, { status: 400 });
    }
    if (typeof title !== 'string' || !title.trim() || title.length > 120) {
      return NextResponse.json({ error: 'Enter the subject name (up to 120 characters).' }, { status: 400 });
    }
    const c = Number(credits ?? 0);
    if (!Number.isInteger(c) || c < 0 || c > 12) {
      return NextResponse.json({ error: 'Credits must be a whole number from 0 to 12.' }, { status: 400 });
    }
    const dept = (await dbService.getDepartments()).find((d) => d.id === departmentId);
    if (!dept) return NextResponse.json({ error: 'Choose a department.' }, { status: 400 });

    const course = await createCourse({ code, title, credits: c, campusId: dept.campusId, departmentId: dept.id }, auth);
    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
