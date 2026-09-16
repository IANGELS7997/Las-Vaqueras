import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { isActiveTrip, mapIangelOrder } from '@/lib/iangel-order';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const queued = await supabase
    .from('orders')
    .select('*')
    .in('delivery_provider', ['self', 'wait_self'])
    .in('status', ['pending', 'preparing', 'in_transit'])
    .order('created_at', { ascending: true })
    .limit(20);

  if (queued.error) {
    return iangelJson(req, { error: queued.error.message }, 500);
  }

  const orders = ((queued.data || []) as Record<string, unknown>[]).map(mapIangelOrder);
  const active = orders.find((order) => isActiveTrip(order.dispatchStatus)) || null;
  return iangelJson(req, { inShift: true, riderActive: true, riderBusy: Boolean(active), active, queue: orders });
}
