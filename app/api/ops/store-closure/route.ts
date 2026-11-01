import { NextResponse } from 'next/server';
import { opsWebhookAuthorized } from '@/lib/ops-webhook';
import { writeManualClosure } from '@/lib/store-closure';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!opsWebhookAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { closed?: boolean };
  if (typeof body.closed !== 'boolean') {
    return NextResponse.json({ error: 'Falta el estado de la tienda' }, { status: 400 });
  }
  try {
    const closed = await writeManualClosure(body.closed);
    return NextResponse.json({ ok: true, closed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se guardó el cierre';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
