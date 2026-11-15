import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { dbService } from '@/lib/db-service';
import { createSection } from '@/lib/services/structure';

/**
 * Admin: add a class (one subject taught to one group): a division for theory,
 * a batch for a lab, or two divisions together for a combined class.
 */
export async function POST(request: Request) {
  const auth = await requireUser('ADMIN_STAFF');
  if (auth instanceof NextResponse) return auth;
  try {
    const b = await request.json();
    const kind = b.kind === 'LAB' ? 'LAB' : b.kind === 'THEORY' ? 'THEORY' : null;
    const periods = Number(b.defaultPeriods ?? (kind === 'LAB' ? 2 : 1));
    const divisions: string[] = Array.isArray(b.divisions) ? b.divisions.filter((d: unknown) => typeof d === 'string' && d.trim()) : [];
    if (!kind) return NextResponse.json({ error: 'Choose theory or lab.' }, { status: 400 });
    if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 80) {
      return NextResponse.json({ error: 'Enter a class name (up to 80 characters).' }, { status: 400 });
    }
    if (!Number.isInteger(periods) || periods < 1 || periods > 3) {
      return NextResponse.json({ error: 'Default periods must be 1, 2 or 3.' }, { status: 400 });
    }
    if (!divisions.length || divisions.length > 4 || divisions.some((d) => d.length > 12)) {
      return NextResponse.json({ error: 'Enter 1–4 divisions, e.g. 5CEA.' }, { status: 400 });
    }
    const term = (await dbService.getTrimesters()).find((t) => t.status === 'ACTIVE');
    if (!term) return NextResponse.json({ error: 'There is no active semester.' }, { status: 400 });

    const section = await createSection(
      {
        courseId: String(b.courseId ?? ''),
        name: b.name,
        kind,
        defaultPeriods: periods,
        divisions,
        batch: typeof b.batch === 'string' ? b.batch.slice(0, 8) : undefined,
        facultyId: String(b.facultyId ?? ''),
        trimesterId: term.id,
      },
      auth
    );
    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
