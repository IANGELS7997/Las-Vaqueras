import { NextResponse } from 'next/server';
import { branchById, orderBranchId } from '@/lib/branches';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { sendRefundRequestNotice } from '@/lib/help-email';
import { notifyIangelHelp } from '@/lib/iangel-ops';
import { customerRefundAmount, customerRefundStatusMessage, CUSTOMER_REFUND_RIDER_KEY, foodMxnFromOrder, REFUND_REVIEW_LABEL } from '@/lib/rider-help';
import { saveHelpEvidence } from '@/lib/rider-help-store';
import { formatMXN } from '@/lib/pricing';
import { createAdminSupabase } from '@/lib/supabase-admin';
import type { CartItem } from '@/types';

export const runtime = 'nodejs';

const REASONS = new Set(['faltó un producto', 'llegó equivocado', 'llegó en mal estado', 'faltó un extra', 'otro']);
const OPEN_STATUSES = new Set(['pending', 'preparing', 'in_transit', 'delivered']);

async function evidenceUrl(supabase: ReturnType<typeof createAdminSupabase>, path: string) {
  const clean = path.trim();
  if (!clean) return '';
  const signed = await supabase.storage.from('help-evidence').createSignedUrl(clean, 60 * 60 * 24 * 7);
  return signed.data?.signedUrl || '';
}

export async function GET() {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) return NextResponse.json({ error: 'Entra a tu perfil' }, { status: 401 });
  const supabase = createAdminSupabase();
  const orders = await supabase.from('orders').select('id').eq('customer_id', customerId);
  const ids = (orders.data || []).map((row) => row.id);
  if (ids.length === 0) return NextResponse.json({ requests: [] });
  const reports = await supabase
    .from('rider_help_reports')
    .select('order_id, resolution, refund_note, refund_credit_mxn, customer_note')
    .in('order_id', ids)
    .eq('kind', 'incomplete');
  return NextResponse.json({
    requests: (reports.data || [])
      .filter((row) => String(row.customer_note || '').trim())
      .map((row) => ({
        orderId: row.order_id,
        message: customerRefundStatusMessage(row),
      })),
  });
}

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) return NextResponse.json({ error: 'Entra a tu perfil' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    reason?: string;
    note?: string;
    ticketPhoto?: string;
    foodPhoto?: string;
  };
  const reason = String(body.reason || '').trim().toLowerCase();
  const note = String(body.note || '').trim();
  if (!REASONS.has(reason)) return NextResponse.json({ error: 'Elige qué falló' }, { status: 400 });
  if (note.length < 8) return NextResponse.json({ error: 'Describe qué pasó' }, { status: 400 });
  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select(
      'id, customer_id, status, short_code, pay_method, cash_food_due, restaurant_payout, total_charged, delivery_fee, customer_fee, branch_id, customer_name, customer_phone, items'
    )
    .eq('id', body.orderId || '')
    .maybeSingle();
  if (!order.data || order.data.customer_id !== customerId) {
    return NextResponse.json({ error: 'Ese pedido no está en tu perfil' }, { status: 404 });
  }
  if (!OPEN_STATUSES.has(String(order.data.status || ''))) {
    return NextResponse.json({ error: 'Ese pedido no se puede reembolsar' }, { status: 400 });
  }
  const report = await supabase
    .from('rider_help_reports')
    .select('id, customer_note, resolution, refund_credit_mxn')
    .eq('order_id', order.data.id)
    .eq('kind', 'incomplete')
    .maybeSingle();
  if (report.error) return NextResponse.json({ error: report.error.message }, { status: 400 });
  const closed =
    report.data?.resolution === 'credit' || report.data?.resolution === 'refunded' || Boolean(report.data?.refund_credit_mxn);
  if (closed) return NextResponse.json({ error: 'Ese reembolso ya quedó cerrado' }, { status: 400 });
  const pending = String(report.data?.customer_note || '').trim() && report.data?.resolution !== 'rejected';
  if (pending) return NextResponse.json({ error: 'Esa solicitud ya fue enviada' }, { status: 400 });
  try {
    const ticket = body.ticketPhoto ? await saveHelpEvidence(supabase, order.data.id, body.ticketPhoto) : '';
    const food = body.foodPhoto ? await saveHelpEvidence(supabase, order.data.id, body.foodPhoto) : '';
    if (!ticket || !food) return NextResponse.json({ error: 'Adjunta la foto del ticket y la foto de la comida' }, { status: 400 });
    const customerFields = {
      customer_reason: reason,
      customer_note: note.slice(0, 500),
      customer_choice: 'discount',
      evidence_path: `${ticket}|${food}`,
      phase: 'customer',
      resolution: null,
      refund_note: null,
      refund_credit_mxn: null,
      kitchen_refund: null,
      admin_refund: null,
      updated_at: new Date().toISOString(),
    };
    const pay = order.data.pay_method === 'cash' ? 'cash' : 'card';
    const money = customerRefundAmount({
      pay,
      cashFood: Number(order.data.cash_food_due || 0),
      total: Number(order.data.total_charged || 0),
      delivery: Number(order.data.delivery_fee || 0),
      service: Number(order.data.customer_fee || 0),
    });
    const summary = `${reason}. ${note}. ${pay === 'cash' ? 'Efectivo' : 'Tarjeta'} ${formatMXN(money.amount)}`.slice(0, 500);
    const saved = report.data
      ? await supabase.from('rider_help_reports').update({ ...customerFields, note: summary }).eq('id', report.data.id).select('id').single()
      : await supabase
          .from('rider_help_reports')
          .insert({
            order_id: order.data.id,
            rider_key: CUSTOMER_REFUND_RIDER_KEY,
            kind: 'incomplete',
            pay_method: pay,
            food_mxn: foodMxnFromOrder(order.data),
            rider_due_mxn: 0,
            customer_due_mxn: 0,
            note: summary,
            ...customerFields,
          })
          .select('id')
          .single();
    if (saved.error || !saved.data) {
      return NextResponse.json({ error: saved.error?.message || 'No se guardó la solicitud' }, { status: 400 });
    }
    const marked = await supabase
      .from('orders')
      .update({ help_kind: 'incomplete', help_label: REFUND_REVIEW_LABEL })
      .eq('id', order.data.id);
    if (marked.error) return NextResponse.json({ error: marked.error.message }, { status: 400 });
    const branch = branchById(orderBranchId(order.data.branch_id));
    const code = String(order.data.short_code || order.data.id).slice(0, 8);
    const [foodPhotoUrl, ticketPhotoUrl] = await Promise.all([evidenceUrl(supabase, food), evidenceUrl(supabase, ticket)]);
    const notice = {
      orderId: order.data.id,
      folio: code,
      branch: branch.shortName,
      customerName: String(order.data.customer_name || ''),
      customerPhone: String(order.data.customer_phone || ''),
      payLabel: pay === 'cash' ? 'Efectivo' : 'Tarjeta',
      amount: money.amount,
      reason,
      note,
      items: (order.data.items || null) as CartItem[] | null,
      foodPhotoUrl,
      ticketPhotoUrl,
    };
    await sendRefundRequestNotice(notice).catch(() => undefined);
    void notifyIangelHelp({
      reportId: saved.data.id,
      externalId: order.data.id,
      kind: 'incomplete',
      label: REFUND_REVIEW_LABEL,
      phase: 'customer',
      payMethod: pay,
      note: summary,
      detail: `Solicitud del cliente #${code}. ${notice.payLabel} ${money.amount}. ${notice.customerName} ${notice.customerPhone}. ${reason}. ${note}`,
      refundAmount: money.amount,
      foodPhotoUrl,
      ticketPhotoUrl,
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      message:
        pay === 'cash'
          ? 'Solicitud enviada. Si se acepta, comida y envío quedan en tu próxima compra.'
          : 'Solicitud enviada. Si se acepta, el total vuelve a tu tarjeta.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se envió la solicitud';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
