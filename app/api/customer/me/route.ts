import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { avatarPublicUrl } from '@/lib/customers';
import { loyaltyKindForOrdinal, loyaltyLabel, paidOrderOrdinal } from '@/lib/loyalty';
import { countPaidOrders } from '@/lib/loyalty-guard';
import { getAvailableJumboReward, getLatestRedeemedJumboReward } from '@/lib/loyalty-reward';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) {
    return NextResponse.json({ customer: null }, { status: 200 });
  }

  const supabase = createAdminSupabase();
  const profile = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
  if (!profile.data) {
    return NextResponse.json({ customer: null }, { status: 200 });
  }

  const orders = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .neq('status', 'awaiting_payment')
    .order('created_at', { ascending: false })
    .limit(50);

  if (orders.error) {
    return NextResponse.json({ error: orders.error.message }, { status: 500 });
  }

  const row = profile.data;
  const paid = await countPaidOrders(supabase, row.id);
  const nextOrdinal = paidOrderOrdinal(paid);
  const nextKind = loyaltyKindForOrdinal(nextOrdinal);
  const jumboReward =
    (await getAvailableJumboReward(supabase, row.id)) ||
    (await getLatestRedeemedJumboReward(supabase, row.id));
  const jumboAvailable = jumboReward?.status === 'available' || jumboReward?.status === 'reserved';
  return NextResponse.json({
    customer: {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      avatarUrl: avatarPublicUrl(row.avatar_path),
    },
    orders: (orders.data || []).map((item) => mapDbOrder(item as DbOrderRow)),
    loyalty: {
      paidOrders: paid,
      nextOrdinal,
      nextLabel: loyaltyLabel(nextKind),
      cycleLabel: `Pedido ${nextOrdinal} de 10`,
      jumboGift: jumboReward
        ? {
            available: jumboAvailable,
            expiresAt: jumboReward.expires_at,
            code: jumboAvailable ? jumboReward.code || null : null,
            redeemedOrderId: jumboReward.redeemed_order_id || null,
          }
        : { available: false, expiresAt: null, code: null, redeemedOrderId: null },
    },
  });
}
