import { NextResponse } from 'next/server';
import { requireKitchenSession } from '@/lib/kitchen-guard';
import { payHelpAtRegister } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const denied = await requireKitchenSession();
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; code?: string };
  const orderId = String(body.orderId || '').trim();
  const code = String(body.code || '').trim();
  if (!orderId || !code) return NextResponse.json({ error: 'Faltan el pedido y el código' }, { status: 400 });
  try {
    const paid = await payHelpAtRegister(createAdminSupabase(), orderId, code);
    return NextResponse.json(paid);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo pagar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
