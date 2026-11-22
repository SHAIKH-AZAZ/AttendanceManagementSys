import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { listFeesForStudent } from '@/lib/services/fees';

/** Student: fees that apply to me (receipts for paid ones) and the gateways I can pay through. */
export async function GET() {
  const auth = await requireUser('STUDENT');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listFeesForStudent(auth));
}
