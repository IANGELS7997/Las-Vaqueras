import { DISPATCH_ACTIVE_TRIP, HEARTBEAT_STALE_MS, IANGEL_SLUG } from '@/lib/iangel-constants';
import { activeRiderKeys, listRiderPresence, serviceIsBusy } from '@/lib/iangel-presence';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type RiderRow = {
  id: string;
  slug: string;
  display_name: string;
  rider_active: boolean;
  uber_direct_enabled: boolean;
  last_ping_at: string | null;
  push_subscription?: unknown | null;
  avatar_path?: string | null;
  emoji?: string | null;
};

export async function getOrCreateRider() {
  const supabase = createAdminSupabase();
  const existing = await supabase.from('iangel_riders').select('*').eq('slug', IANGEL_SLUG).maybeSingle();
  if (existing.data) return existing.data as RiderRow;
  const inserted = await supabase
    .from('iangel_riders')
    .insert({
      slug: IANGEL_SLUG,
      display_name: 'IANGEL',
      rider_active: false,
      uber_direct_enabled: false,
    })
    .select('*')
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  return inserted.data as RiderRow;
}

export async function isRiderBusy() {
  const supabase = createAdminSupabase();
  const active = await supabase
    .from('orders')
    .select('id')
    .in('delivery_provider', ['self', 'wait_self'])
    .in('dispatch_status', [...DISPATCH_ACTIVE_TRIP])
    .limit(1);
  return Boolean(active.data && active.data.length > 0);
}

function isPingStale(lastPingAt: string | null | undefined) {
  if (!lastPingAt) return true;
  const at = new Date(lastPingAt).getTime();
  if (!Number.isFinite(at)) return true;
  return Date.now() - at > HEARTBEAT_STALE_MS;
}

/**
 * Flags usados en cotización / ruteo.
 * riderActive efectivo exige toggle ON + heartbeat fresco (evita “fantasma online” si la app murió).
 * uberDirectEnabled es independiente: Vaqueras puede cotizar Uber aunque IANGEL esté offline.
 */
export async function getRoutingRiderFlags() {
  try {
    const rider = await getOrCreateRider();
    const presence = await listRiderPresence();
    const liveKeys = activeRiderKeys(presence);
    const flaggedActive = presence.some((row) => row.rider_active === true) || rider.rider_active === true;
    const pingStale = flaggedActive && liveKeys.length === 0 && isPingStale(rider.last_ping_at);
    const legacyLive = rider.rider_active === true && !isPingStale(rider.last_ping_at);
    const riderActive = liveKeys.length > 0 || (liveKeys.length === 0 && legacyLive);
    const open = await createAdminSupabase()
      .from('orders')
      .select('iangel_rider_key, dispatch_status, status')
      .in('delivery_provider', ['self', 'wait_self'])
      .in('status', ['pending', 'preparing', 'in_transit']);
    const openKeys = ((open.data || []) as { iangel_rider_key?: string | null; dispatch_status?: string | null; status?: string | null }[])
      .filter((row) => row.status !== 'delivered' && row.dispatch_status && ['assigned', 'picked_up', 'en_route', 'arrived', 'waiting_customer'].includes(row.dispatch_status))
      .map((row) => row.iangel_rider_key || null);
    const busy = liveKeys.length > 0 ? serviceIsBusy(liveKeys, openKeys) : await isRiderBusy();
    return {
      rider,
      riderActive,
      riderFlaggedActive: flaggedActive,
      uberDirectEnabled: rider.uber_direct_enabled === true,
      riderBusy: busy,
      pingStale,
    };
  } catch {
    return {
      rider: null,
      riderActive: false,
      riderFlaggedActive: false,
      uberDirectEnabled: false,
      riderBusy: false,
      pingStale: false,
    };
  }
}
