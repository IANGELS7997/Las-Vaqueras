import { NextResponse } from 'next/server';
import { buildOpsHealthReport } from '@/lib/ops-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = (process.env.OPS_HEALTH_SECRET || '').trim();
  if (!secret) return false;

  const header = req.headers.get('authorization') || '';
  if (header === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  return token === secret;
}

/**
 * Health check operable desde el celular.
 * GET /api/ops/health?token=OPS_HEALTH_SECRET
 * o Authorization: Bearer OPS_HEALTH_SECRET
 */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const report = await buildOpsHealthReport();
  return NextResponse.json(report, {
    status: report.fatal ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
