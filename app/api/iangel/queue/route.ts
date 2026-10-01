import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { isActiveTrip, mapIangelOrder } from '@/lib/iangel-order';
import { getRiderPresence, orderVisibleToRider } from '@/lib/iangel-presence';
import { isIangelShift } from '@/lib/iangel-shift';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
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

  // Excluye entregados/incidentes aunque el status kitchen haya quedado desfasado.
  const presence = await getRiderPresence(riderKey);
  const locked = Boolean(String((presence as { help_lock_note?: string | null }).help_lock_note || '').trim());
  const closed = new Set(['delivered', 'incident', 'delivered_unclaimed', 'help_return']);
  const mine = ((queued.data || []) as Record<string, unknown>[]).filter((row) => {
    if (!orderVisibleToRider(row as { iangel_rider_key?: string | null }, riderKey)) return false;
    if (!locked) return true;
    return String(row.iangel_rider_key || '') === riderKey;
  });
  const orders = mine.map(mapIangelOrder).filter((order) => !closed.has(String(order.dispatchStatus || '')));
  const active =
    orders.find((order) => {
      const row = mine.find((item) => String(item.id) === order.id);
      const owner = String(row?.iangel_rider_key || '');
      return isActiveTrip(order.dispatchStatus) && owner === riderKey;
    }) || null;
  const flags = await getRoutingRiderFlags();
  return iangelJson(req, {
    inShift: isIangelShift(),
    riderActive: flags.riderActive,
    riderFlaggedActive: flags.riderFlaggedActive,
    uberDirectEnabled: flags.uberDirectEnabled,
    riderBusy: Boolean(active) || flags.riderBusy,
    pingStale: flags.pingStale,
    active,
    queue: orders,
  });
}
