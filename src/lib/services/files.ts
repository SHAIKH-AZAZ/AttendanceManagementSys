import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import type { FilePurpose, StoredFile } from '@/types';
import { connectToDatabase } from '../mongodb';

/*
 * Uploaded files live in MongoDB GridFS (bucket "uploads"), so no separate
 * storage service is needed. Access rules are checked by the API routes.
 */

// 4 MB: hosts such as Vercel reject request bodies over ~4.5 MB before the route runs.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

/** Allowed types, recognised by their first bytes (not by the name the browser sends). */
const SIGNATURES: { type: string; ext: string[]; magic: number[] }[] = [
  { type: 'application/pdf', ext: ['pdf'], magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { type: 'image/png', ext: ['png'], magic: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/jpeg', ext: ['jpg', 'jpeg'], magic: [0xff, 0xd8, 0xff] },
  // DOCX, PPTX, XLSX and ZIP are all zip containers.
  { type: 'application/zip', ext: ['zip', 'docx', 'pptx', 'xlsx'], magic: [0x50, 0x4b, 0x03, 0x04] },
  // Legacy Office (DOC, PPT, XLS).
  { type: 'application/x-ole-storage', ext: ['doc', 'ppt', 'xls'], magic: [0xd0, 0xcf, 0x11, 0xe0] },
];

const OFFICE_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  doc: 'application/msword',
  ppt: 'application/vnd.ms-powerpoint',
  xls: 'application/vnd.ms-excel',
};

export const ALLOWED_EXTENSIONS = SIGNATURES.flatMap((s) => s.ext);

/** Work out the real content type, or throw a message the user can act on. */
export function sniffType(filename: string, bytes: Uint8Array): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const sig = SIGNATURES.find((s) => s.ext.includes(ext));
  if (!sig) throw new Error(`Only these file types are allowed: ${ALLOWED_EXTENSIONS.join(', ')}.`);
  if (!sig.magic.every((b, i) => bytes[i] === b)) throw new Error(`"${filename}" is not a valid .${ext} file.`);
  return OFFICE_TYPES[ext] ?? sig.type;
}

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db!, { bucketName: 'uploads' });
}

/** Clean a user-supplied filename for storage and the Content-Disposition header. */
const safeName = (name: string) => name.replace(/[^\w.\- ()]/g, '_').slice(-120) || 'file';

export async function saveFile(input: {
  filename: string;
  bytes: Uint8Array;
  ownerId: string;
  purpose: FilePurpose;
}): Promise<StoredFile> {
  if (input.bytes.length === 0) throw new Error('The file is empty.');
  if (input.bytes.length > MAX_FILE_BYTES) throw new Error('Files can be at most 4 MB.');
  const contentType = sniffType(input.filename, input.bytes);
  await connectToDatabase();

  const id = `file-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  const filename = safeName(input.filename);
  const meta = { ownerId: input.ownerId, purpose: input.purpose, contentType };
  await new Promise<void>((resolve, reject) => {
    const up = bucket().openUploadStreamWithId(id as never, filename, { metadata: meta });
    up.once('finish', () => resolve());
    up.once('error', reject);
    up.end(Buffer.from(input.bytes));
  });
  return { id, filename, contentType, size: input.bytes.length, ownerId: input.ownerId, purpose: input.purpose, uploadedAt: new Date().toISOString() };
}

export async function getFileMeta(id: string): Promise<StoredFile | null> {
  await connectToDatabase();
  const f = await bucket().find({ _id: id as never }).next();
  if (!f) return null;
  return {
    id,
    filename: f.filename,
    contentType: f.metadata?.contentType ?? 'application/octet-stream',
    size: f.length,
    ownerId: f.metadata?.ownerId,
    purpose: f.metadata?.purpose,
    uploadedAt: f.uploadDate.toISOString(),
  };
}

export async function readFile(id: string): Promise<Buffer> {
  await connectToDatabase();
  const chunks: Buffer[] = [];
  for await (const c of bucket().openDownloadStream(id as never)) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export async function deleteFile(id: string) {
  await connectToDatabase();
  await bucket().delete(id as never).catch(() => undefined);
}
