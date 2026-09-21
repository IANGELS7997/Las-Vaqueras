import { NextResponse } from 'next/server';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { advancePickupOrderIfDue } from '@/lib/order-auto-advance';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const advanced = await advancePickupOrderIfDue(supabase, data as DbOrderRow);

  return NextResponse.json(
    { order: mapDbOrder(advanced) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
