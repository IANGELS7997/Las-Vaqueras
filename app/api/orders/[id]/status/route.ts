import { NextResponse } from 'next/server';
import { isOrderStatus, mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { status } = await req.json();
  if (!isOrderStatus(status)) {
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
