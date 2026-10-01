import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { saveHelpEvidence } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const REASONS = new Set(['faltó un producto', 'llegó equivocado', 'llegó en mal estado', 'faltó un extra', 'otro']);

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) return NextResponse.json({ error: 'Entra a tu perfil' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: string;
    reason?: string;
    note?: string;
    choice?: string;
    ticketPhoto?: string;
    foodPhoto?: string;
  };
  const reason = String(body.reason || '').trim().toLowerCase();
  const note = String(body.note || '').trim();
  const choice = body.choice === 'bank' || body.choice === 'discount' ? body.choice : '';
  if (!REASONS.has(reason)) return NextResponse.json({ error: 'Elige qué falló' }, { status: 400 });
  if (note.length < 8) return NextResponse.json({ error: 'Describe qué pasó' }, { status: 400 });
  if (!choice) return NextResponse.json({ error: 'Elige reembolso a tu cuenta o descuento en la próxima compra' }, { status: 400 });
  const supabase = createAdminSupabase();
  const order = await supabase.from('orders').select('id, customer_id').eq('id', body.orderId || '').maybeSingle();
  if (!order.data || order.data.customer_id !== customerId) {
    return NextResponse.json({ error: 'Ese pedido no está en tu perfil' }, { status: 404 });
  }
  const report = await supabase
    .from('rider_help_reports')
    .select('id')
    .eq('order_id', order.data.id)
    .eq('kind', 'incomplete')
    .maybeSingle();
  if (!report.data) {
    return NextResponse.json(
      { error: 'El repartidor también tiene que reportar el pedido incorrecto o incompleto' },
      { status: 400 }
    );
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
        customer_choice: choice,
        evidence_path: `${ticket}|${food}`,
        phase: 'customer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', report.data.id);
    if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 400 });
    return NextResponse.json({
      ok: true,
      message: 'Solicitud enviada. Se revisa en Reembolsos y, si se aprueba, el plazo es de 72 horas.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se envió la solicitud';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
