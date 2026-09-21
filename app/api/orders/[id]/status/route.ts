import { NextResponse } from 'next/server';
import { KITCHEN_ORDER_STATUSES, mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { patchFromKitchenStatus } from '@/lib/order-lifecycle';
import type { OrderStatus } from '@/types';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { requireKitchenSession } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const status = body.status as string | undefined;
  const cookHold = typeof body.cookHold === 'boolean' ? body.cookHold : undefined;

  if (status !== undefined && !KITCHEN_ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }
  if (status === undefined && cookHold === undefined) {
    return NextResponse.json({ error: 'sin cambios' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!current.data) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (cookHold !== undefined) {
    patch.cook_hold = cookHold;
    if (cookHold) {
      patch.dispatch_status = 'cook_hold';
    } else if (String(current.data.dispatch_status || '') === 'cook_hold') {
      const fulfillment = current.data.fulfillment_type === 'pickup' ? 'pickup' : 'delivery';
      patch.dispatch_status = fulfillment === 'pickup' ? null : 'self_iangel';
    }
  }

  if (status) {
    Object.assign(
      patch,
      patchFromKitchenStatus(status as OrderStatus, {
        status: current.data.status,
        dispatchStatus:
          typeof patch.dispatch_status === 'string'
            ? patch.dispatch_status
            : current.data.dispatch_status,
        fulfillment: current.data.fulfillment_type,
        cookHold: cookHold ?? current.data.cook_hold,
        leaveAtDoor: current.data.leave_at_door,
      })
    );
  }

  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: mapDbOrder(data as DbOrderRow) });
}
