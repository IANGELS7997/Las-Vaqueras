import { NextResponse } from 'next/server';
import { orderBranchId } from '@/lib/branches';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { listHelpReports, resolveHelpReport, decideIncompleteRefund } from '@/lib/rider-help-store';
import { HELP_LABELS, isHelpKind, isOpenCustomerRefund, REFUND_REVIEW_LABEL } from '@/lib/rider-help';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;
  try {
    const supabase = createAdminSupabase();
    const rows = await listHelpReports(supabase);
    const orderIds = rows.map((row) => row.order_id).filter(Boolean);
    const owned = orderIds.length
      ? await supabase.from('orders').select('id, branch_id').in('id', orderIds)
      : { data: [] };
    const allowed = new Set(
      (owned.data || [])
        .filter((row) => orderBranchId(row.branch_id) === branch)
        .map((row) => row.id)
    );
    const visible = rows.filter((row) => allowed.has(row.order_id));
    return NextResponse.json({
      reports: visible.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        kind: row.kind,
        label: (() => {
          if (isOpenCustomerRefund(row)) return REFUND_REVIEW_LABEL;
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
        kitchenRefund: row.kitchen_refund,
        adminRefund: row.admin_refund,
        refundNote: row.refund_note,
        refundCreditMxn: row.refund_credit_mxn,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron leer los reportes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function ownsReport(reportId: string, branch: string) {
  const supabase = createAdminSupabase();
  const report = await supabase.from('rider_help_reports').select('order_id').eq('id', reportId).maybeSingle();
  if (!report.data?.order_id) return false;
  const order = await supabase.from('orders').select('branch_id').eq('id', report.data.order_id).maybeSingle();
  return orderBranchId(order.data?.branch_id) === branch;
}

export async function POST(req: Request) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    decision?: string;
    scope?: string;
    reason?: string;
  };
  if (body.scope === 'refund') {
    const vote = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null;
    if (!body.id || !vote) return NextResponse.json({ error: 'Falta el caso o la decisión' }, { status: 400 });
    if (!(await ownsReport(body.id, branch))) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }
    try {
      const saved = await decideIncompleteRefund(createAdminSupabase(), body.id, 'kitchen', vote, body.reason || '');
      return NextResponse.json(saved);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo resolver';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
  const decision = body.decision === 'approved' || body.decision === 'rejected' || body.decision === 'deposited' ? body.decision : null;
  if (!body.id || !decision) return NextResponse.json({ error: 'Falta el caso o la decisión' }, { status: 400 });
  if (!(await ownsReport(body.id, branch))) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }
  try {
    const saved = await resolveHelpReport(createAdminSupabase(), body.id, decision);
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo resolver';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
