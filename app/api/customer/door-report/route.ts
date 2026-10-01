import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { sendDoorReportNotice } from '@/lib/help-email';
import { notifyIangelHelp } from '@/lib/iangel-ops';
import { foodMxnFromOrder, type HelpPay } from '@/lib/rider-help';
import { saveHelpEvidence } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) return NextResponse.json({ error: 'Entra a tu perfil' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    note?: string;
    photo?: string;
  };
  const note = String(body.note || '').trim();
  if (note.length < 8) return NextResponse.json({ error: 'Describe qué pasó' }, { status: 400 });
  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select('id, customer_id, leave_at_door, iangel_rider_key, pay_method, short_code, total_charged')
    .eq('id', body.orderId || '')
    .maybeSingle();
  if (!order.data || order.data.customer_id !== customerId) {
    return NextResponse.json({ error: 'Ese pedido no está en tu perfil' }, { status: 404 });
  }
  if (order.data.leave_at_door !== true) {
    return NextResponse.json({ error: 'Este pedido no estaba marcado para dejar en la puerta' }, { status: 400 });
  }
  const existing = await supabase
    .from('rider_help_reports')
    .select('id, resolution')
    .eq('order_id', order.data.id)
    .eq('kind', 'door_missing')
    .maybeSingle();
  if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 400 });
  if (existing.data) {
    return NextResponse.json({ error: 'Ya enviaste este reporte' }, { status: 400 });
  }
  try {
    const photo = body.photo ? await saveHelpEvidence(supabase, order.data.id, body.photo) : '';
    if (!photo) return NextResponse.json({ error: 'Adjunta una foto de la puerta o del lugar vacío' }, { status: 400 });
    const pay: HelpPay = order.data.pay_method === 'cash' ? 'cash' : 'card';
    const riderKey = String(order.data.iangel_rider_key || '').trim() || 'angel';
    const saved = await supabase
      .from('rider_help_reports')
      .insert({
        order_id: order.data.id,
        rider_key: riderKey,
        kind: 'door_missing',
        phase: 'customer',
        pay_method: pay,
        food_mxn: foodMxnFromOrder(order.data as Record<string, unknown>),
        rider_due_mxn: 0,
        customer_due_mxn: 0,
        note: note.slice(0, 500),
        evidence_path: photo,
        customer_note: note.slice(0, 500),
      })
      .select('id')
      .single();
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 });
    const short = String(order.data.short_code || order.data.id.replace(/-/g, '').slice(0, 4)).toUpperCase();
    void sendDoorReportNotice({ orderId: order.data.id, shortCode: short, note }).catch(() => undefined);
    void notifyIangelHelp({
      reportId: saved.data.id,
      externalId: order.data.id,
      kind: 'door_missing',
      label: 'No dejaron el pedido en la puerta',
      phase: 'customer',
      payMethod: pay,
      note,
      resolution: null,
    }).catch(() => undefined);
    return NextResponse.json({
      ok: true,
      message: 'Reporte enviado. Si se aprueba, se reembolsa lo que pagaste.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se envió el reporte';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
