import { NextResponse } from 'next/server';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createAdminSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    orders: (data || []).map((row) => mapDbOrder(row as DbOrderRow)),
  });
}
