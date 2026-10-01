import { NextResponse } from 'next/server';
import { decideIncompleteRefund, resolveHelpReport } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret') || '';
  const expected = process.env.IANGEL_OPS_WEBHOOK_SECRET || '';
  if (!sameSecret(secret, expected)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { reportId?: string; decision?: string; reason?: string };
  if (body.decision === 'refund_approved' || body.decision === 'refund_rejected') {
    if (!body.reportId) return NextResponse.json({ error: 'Falta el caso' }, { status: 400 });
    try {
      const saved = await decideIncompleteRefund(
        createAdminSupabase(),
        body.reportId,
        'admin',
        body.decision === 'refund_approved' ? 'approved' : 'rejected',
        body.reason || ''
      );
      return NextResponse.json(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo resolver';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  const decision = body.decision === 'approved' || body.decision === 'rejected' || body.decision === 'deposited' ? body.decision : null;
  if (!body.reportId || !decision) return NextResponse.json({ error: 'Falta el caso o la decisión' }, { status: 400 });
  try {
    const saved = await resolveHelpReport(createAdminSupabase(), body.reportId, decision);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo resolver';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
