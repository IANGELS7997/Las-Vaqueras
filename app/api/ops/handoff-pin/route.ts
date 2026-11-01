import { NextResponse } from 'next/server';
import { isHandoffPin, sendHandoffPinEmail } from '@/lib/handoff-pin-email';
import { opsWebhookAuthorized } from '@/lib/ops-webhook';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!opsWebhookAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; pin?: string };
  const orderId = String(body.orderId || '').trim();
  const pin = String(body.pin || '').trim();
  if (!orderId || !isHandoffPin(pin)) {
    return NextResponse.json({ error: 'Escribe un PIN de 4 dígitos' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (!current.data) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  if (current.data.delivery_provider !== 'managed') {
    return NextResponse.json({ error: 'La clave solo se envía en Gestionar pedido' }, { status: 400 });
  }
  if (current.data.status === 'delivered' || current.data.status === 'cancelled') {
    return NextResponse.json({ error: 'Este pedido ya no está en curso' }, { status: 400 });
  }
  const email = String(current.data.customer_email || '').trim();
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Este pedido no tiene correo del cliente' }, { status: 400 });
  }

  const saved = await supabase.from('orders').update({ handoff_pin: pin }).eq('id', orderId).select('id').maybeSingle();
  if (saved.error || !saved.data) {
    return NextResponse.json({ error: saved.error?.message || 'No se guardó la clave' }, { status: 500 });
  }

  const mailed = await sendHandoffPinEmail({
    to: email,
    customerName: String(current.data.customer_name || ''),
    orderId,
    token: current.data.profile_login_token,
    branchId: current.data.branch_id,
    pin,
  });
  if (!mailed.ok) {
    return NextResponse.json({ error: 'La clave quedó guardada, pero el correo no salió' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, orderId, pin });
}
