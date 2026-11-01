import { NextResponse } from 'next/server';
import { readManualClosure } from '@/lib/store-closure';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const closed = await readManualClosure();
  return NextResponse.json({ closed }, { headers: { 'Cache-Control': 'no-store' } });
}
