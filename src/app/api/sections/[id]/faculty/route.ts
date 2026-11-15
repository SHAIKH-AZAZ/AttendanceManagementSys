import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { dbService } from '@/lib/db-service';
import { allocateFaculty } from '@/lib/services/structure';
import { notify } from '@/lib/services/notifications';

/** HOD (own department) or admin: assign a class to a teacher. Body: { facultyId }. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser('HOD', 'ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const { facultyId } = await request.json();
    const section = (await dbService.getSections()).find((s) => s.id === id);
    if (!section) return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
    if (auth.role === 'HOD' && section.departmentId !== auth.departmentId) {
      return NextResponse.json({ error: 'That class belongs to another department.' }, { status: 403 });
    }
    if (typeof facultyId !== 'string' || facultyId === section.facultyId) {
      return NextResponse.json({ error: 'Choose a different faculty member.' }, { status: 400 });
    }
    const updated = await allocateFaculty(id, facultyId, auth);
    await notify([facultyId], { title: 'New class assigned', body: `You now teach ${updated.name}.`, tab: 'faculty-overview' });
    return NextResponse.json({ section: updated });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
