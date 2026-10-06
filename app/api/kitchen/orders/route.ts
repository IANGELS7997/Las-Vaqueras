import { NextResponse } from 'next/server';
import { advancePickupOrdersIfDue } from '@/lib/order-auto-advance';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { REFUND_REVIEW_LABEL } from '@/lib/rider-help';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { activeRiderKeys, listRiderPresence } from '@/lib/iangel-presence';
import { requireKitchenBranch } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;

  const supabase = createAdminSupabase();
  const history = new URL(req.url).searchParams.get('scope') === 'history';
  if (history) {
    const found = await supabase
      .from('orders')
      .select('id, short_code, customer_name, status, fulfillment_type, created_at, total_charged, cash_food_due, pay_method, help_label, branch_id')
      .eq('branch_id', branch)
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false })
      .limit(400);
    if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });
    return NextResponse.json({
      orders: (found.data || []).map((row) => ({
        id: row.id,
        code: row.short_code || String(row.id).slice(0, 8),
        customer: row.customer_name,
        status: row.status,
        fulfillment: row.fulfillment_type,
        createdAt: row.created_at,
        total: Number(row.pay_method === 'cash' ? row.cash_food_due || 0 : row.total_charged || 0),
        outcome: row.help_label || 'Entrega normal',
      })),
    });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('branch_id', branch)
    .neq('status', 'awaiting_payment')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const review = await supabase
    .from('orders')
    .select('*')
    .eq('branch_id', branch)
    .eq('help_label', REFUND_REVIEW_LABEL)
    .limit(40);
  if (review.error) return NextResponse.json({ error: review.error.message }, { status: 500 });

  const merged = new Map<string, DbOrderRow>();
  for (const row of [...(data || []), ...(review.data || [])]) {
    merged.set(String(row.id), row as DbOrderRow);
  }

  const advanced = await advancePickupOrdersIfDue(supabase, Array.from(merged.values()));
  const presence = await listRiderPresence();

  return NextResponse.json({
    orders: advanced.map((row) => mapDbOrder(row)),
    liveRiderKeys: activeRiderKeys(presence),
  });
}
