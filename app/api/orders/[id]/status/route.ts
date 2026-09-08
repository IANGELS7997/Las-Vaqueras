import { NextResponse } from 'next/server';
import { KITCHEN_ORDER_STATUSES, mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import type { OrderStatus } from '@/types';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { requireKitchenSession } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';

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
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: mapDbOrder(data as DbOrderRow) });
}
