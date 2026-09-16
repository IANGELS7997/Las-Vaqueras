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

  const { status } = await req.json();
  if (!KITCHEN_ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!current.data) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const patch = patchFromKitchenStatus(status as OrderStatus, {
    status: current.data.status,
    dispatchStatus: current.data.dispatch_status,
    fulfillment: current.data.fulfillment_type,
    cookHold: current.data.cook_hold,
    leaveAtDoor: current.data.leave_at_door,
  });

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
