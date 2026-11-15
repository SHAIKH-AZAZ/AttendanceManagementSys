import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { getFileMeta, readFile } from '@/lib/services/files';
import { canReadFile } from '@/lib/services/file-access';

/** Download a file the signed-in user is allowed to see. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const meta = await getFileMeta(id);
  // Same answer for "missing" and "not yours", so ids can't be probed.
  if (!meta || !(await canReadFile(auth, meta))) {
    return NextResponse.json({ error: 'File not found.' }, { status: 404 });
  }
  const body = await readFile(id);
  const inline = meta.contentType === 'application/pdf' || meta.contentType.startsWith('image/');
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': meta.contentType,
      'Content-Length': String(body.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${meta.filename.replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
      'Cache-Control': 'private, no-store',
    },
  });
}
