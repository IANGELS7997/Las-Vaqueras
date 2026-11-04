import { NextResponse } from 'next/server';
import { commitHandoffPin } from '@/lib/handoff-pin';
import { opsWebhookAuthorized } from '@/lib/ops-webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!opsWebhookAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; pin?: string };
  const result = await commitHandoffPin({
    orderId: String(body.orderId || ''),
    pin: String(body.pin || ''),
    source: 'panel',
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, orderId: result.order.id, pin: result.pin });
}
