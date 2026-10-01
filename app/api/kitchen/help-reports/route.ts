import { NextResponse } from 'next/server';
import { requireKitchenSession } from '@/lib/kitchen-guard';
import { listHelpReports, resolveHelpReport } from '@/lib/rider-help-store';
import { HELP_LABELS, isHelpKind } from '@/lib/rider-help';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const denied = await requireKitchenSession();
  if (denied) return denied;
  try {
    const rows = await listHelpReports(createAdminSupabase());
    return NextResponse.json({
      reports: rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        kind: row.kind,
        label: (() => {
          const kind = String(row.kind || '');
          return isHelpKind(kind) ? HELP_LABELS[kind] : kind;
        })(),
        phase: row.phase,
        payMethod: row.pay_method,
        foodMxn: row.food_mxn,
        riderDueMxn: row.rider_due_mxn,
        customerDueMxn: row.customer_due_mxn,
        note: row.note,
        payoutCode: row.payout_code,
        payoutPaidAt: row.payout_paid_at,
        resolution: row.resolution,
        customerReason: row.customer_reason,
        customerNote: row.customer_note,
        customerChoice: row.customer_choice,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron leer los reportes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = await requireKitchenSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { id?: string; decision?: string };
  const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null;
  if (!body.id || !decision) return NextResponse.json({ error: 'Falta el caso o la decisión' }, { status: 400 });
  try {
    const saved = await resolveHelpReport(createAdminSupabase(), body.id, decision);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo resolver';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
