import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { DISPATCH_ACTIVE_TRIP } from '@/lib/iangel-constants';
import { isIangelShift } from '@/lib/iangel-shift';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const { riderActive, riderBusy } = await getRoutingRiderFlags();
  const queue = await supabase
    .from('orders')
    .select('*')
    .in('delivery_provider', ['self', 'wait_self'])
    .in('status', ['pending', 'preparing', 'in_transit'])
    .order('created_at', { ascending: true })
    .limit(20);
  const orders = (queue.data || []).map((row) => mapDbOrder(row as DbOrderRow));
  const active = orders.find((order) =>
    (DISPATCH_ACTIVE_TRIP as readonly string[]).includes(order.dispatchStatus || '')
  );
  return iangelJson(req, {
    inShift: isIangelShift(),
    riderActive,
    riderBusy,
    active,
    queue: orders,
  });
}
