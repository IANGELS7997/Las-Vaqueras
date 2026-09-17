import { DISPATCH_ACTIVE_TRIP, HEARTBEAT_STALE_MS, IANGEL_SLUG } from '@/lib/iangel-constants';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type RiderRow = {
  id: string;
  slug: string;
  display_name: string;
  rider_active: boolean;
  last_ping_at: string | null;
};

export async function getOrCreateRider() {
  const supabase = createAdminSupabase();
  const existing = await supabase.from('iangel_riders').select('*').eq('slug', IANGEL_SLUG).maybeSingle();
  if (existing.data) return existing.data as RiderRow;
  const inserted = await supabase
    .from('iangel_riders')
    .insert({ slug: IANGEL_SLUG, display_name: 'IANGEL', rider_active: true })
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

export async function getRoutingRiderFlags() {
  try {
    const rider = await getOrCreateRider();
    const busy = await isRiderBusy();
    return {
      rider,
      riderActive: rider.rider_active !== false,
      riderBusy: busy,
      pingStale:
        rider.rider_active !== false &&
        (!rider.last_ping_at || Date.now() - new Date(rider.last_ping_at).getTime() > HEARTBEAT_STALE_MS),
    };
  } catch {
    return { rider: null, riderActive: true, riderBusy: false, pingStale: false };
  }
}
