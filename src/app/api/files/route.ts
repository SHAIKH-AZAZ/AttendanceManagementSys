import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { saveFile } from '@/lib/services/files';
import type { FilePurpose } from '@/types';

/** Who may upload which kind of file. */
const UPLOADERS: Record<FilePurpose, string[]> = {
  LEAVE_PROOF: ['STUDENT'],
  SUBMISSION: ['STUDENT'],
  ASSIGNMENT: ['FACULTY', 'HOD'],
};

/** Upload one file (multipart form: `file`, `purpose`). Returns its id and details. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const purpose = form.get('purpose') as FilePurpose;
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    if (!UPLOADERS[purpose]) return NextResponse.json({ error: 'Unknown upload purpose.' }, { status: 400 });
    if (!UPLOADERS[purpose].includes(auth.role)) return NextResponse.json({ error: 'You cannot upload this kind of file.' }, { status: 403 });

    const stored = await saveFile({
      filename: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      ownerId: auth.id,
      purpose,
    });
    return NextResponse.json({ file: stored }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
