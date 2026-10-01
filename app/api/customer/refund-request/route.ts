import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { notifyIangelHelp } from '@/lib/iangel-ops';
import { HELP_LABELS } from '@/lib/rider-help';
import { refundStillOpen, saveHelpEvidence } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const REASONS = new Set(['faltó un producto', 'llegó equivocado', 'llegó en mal estado', 'faltó un extra', 'otro']);

function statusOf(row: {
  resolution?: string | null;
  kitchen_refund?: string | null;
  admin_refund?: string | null;
  refund_note?: string | null;
  refund_credit_mxn?: number | null;
}) {
  if (row.refund_credit_mxn || row.resolution === 'credit') {
    return `Aceptado. ${row.refund_credit_mxn || 0} pesos quedan en tu próxima compra.`;
  }
  if (row.resolution === 'rejected') {
    return `Rechazado. ${row.refund_note || 'No hay crédito en la próxima compra.'}`;
  }
  if (row.kitchen_refund === 'approved' || row.admin_refund === 'approved') {
    return 'Una parte ya aceptó. Falta la otra para aplicar el crédito.';
  }
  return 'Solicitud enviada. Cocina y admin tienen que aceptarla.';
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
    .select('order_id, resolution, kitchen_refund, admin_refund, refund_note, refund_credit_mxn, customer_note')
    .in('order_id', ids)
    .eq('kind', 'incomplete');
  return NextResponse.json({
    requests: (reports.data || [])
      .filter((row) => String(row.customer_note || '').trim())
      .map((row) => ({
        orderId: row.order_id,
        message: statusOf(row),
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
    .select('id, customer_id, status, created_at, short_code, pay_method')
    .eq('id', body.orderId || '')
    .maybeSingle();
  if (!order.data || order.data.customer_id !== customerId) {
    return NextResponse.json({ error: 'Ese pedido no está en tu perfil' }, { status: 404 });
  }
  if (order.data.status !== 'delivered') {
    return NextResponse.json({ error: 'El reembolso se pide cuando el pedido ya se entregó' }, { status: 400 });
  }
  if (!refundStillOpen(order.data.created_at)) {
    return NextResponse.json({ error: 'Pasaron más de 48 horas desde el pedido' }, { status: 400 });
  }
  const report = await supabase
    .from('rider_help_reports')
    .select('id, customer_note')
    .eq('order_id', order.data.id)
    .eq('kind', 'incomplete')
    .maybeSingle();
  if (!report.data) {
    return NextResponse.json(
      { error: 'El repartidor también tiene que reportar el pedido incorrecto o incompleto' },
      { status: 400 }
    );
  }
  if (String(report.data.customer_note || '').trim()) {
    return NextResponse.json({ error: 'Esa solicitud ya fue enviada' }, { status: 400 });
  }
  try {
    const ticket = body.ticketPhoto ? await saveHelpEvidence(supabase, order.data.id, body.ticketPhoto) : '';
    const food = body.foodPhoto ? await saveHelpEvidence(supabase, order.data.id, body.foodPhoto) : '';
    if (!ticket || !food) return NextResponse.json({ error: 'Adjunta la foto del ticket y la foto de la comida' }, { status: 400 });
    const saved = await supabase
      .from('rider_help_reports')
      .update({
        customer_reason: reason,
        customer_note: note.slice(0, 500),
        customer_choice: 'discount',
        evidence_path: `${ticket}|${food}`,
        phase: 'customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.data.id);
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 });
    const code = String(order.data.short_code || order.data.id).slice(0, 8);
    void notifyIangelHelp({
      reportId: report.data.id,
      externalId: order.data.id,
      kind: 'incomplete',
      label: HELP_LABELS.incomplete,
      phase: 'customer',
      payMethod: order.data.pay_method || 'card',
      note: `${reason}. ${note}`,
      detail: `Solicitud del cliente #${code}. Comida + envío en la próxima compra. ${note}`,
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      message: 'Solicitud enviada. El crédito de comida y envío se aplica en tu próxima compra solo si cocina y admin la aceptan. Tienes 48 horas desde el pedido.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se envió la solicitud';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
