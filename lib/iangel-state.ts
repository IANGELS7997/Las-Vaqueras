import { DISPATCH_ACTIVE_TRIP, HEARTBEAT_STALE_MS, IANGEL_SLUG } from '@/lib/iangel-constants';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type RiderRow = {
  id: string;
  slug: string;
  display_name: string;
  rider_active: boolean;
  uber_direct_enabled: boolean;
  last_ping_at: string | null;
  push_subscription?: unknown | null;
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
    const busy = await isRiderBusy();
    const flaggedActive = rider.rider_active === true;
    const pingStale = isPingStale(rider.last_ping_at);
    return {
      rider,
      riderActive: flaggedActive && !pingStale,
      riderFlaggedActive: flaggedActive,
      uberDirectEnabled: rider.uber_direct_enabled === true,
      riderBusy: busy,
      pingStale: flaggedActive && pingStale,
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
