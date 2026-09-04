import { NextResponse } from 'next/server';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

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

  return NextResponse.json({ order: mapDbOrder(data as DbOrderRow) });
}
