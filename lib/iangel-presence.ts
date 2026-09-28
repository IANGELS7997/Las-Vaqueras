import { ANGEL_RIDER_KEY } from '@/lib/iangel-auth';
import { HEARTBEAT_STALE_MS } from '@/lib/iangel-constants';
import { isActiveTrip } from '@/lib/iangel-order';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type RiderPresence = {
  rider_key: string;
  display_name: string;
  rider_active: boolean;
  last_ping_at: string | null;
  push_subscription: unknown;
  lat: number | null;
  lng: number | null;
};

export function orderVisibleToRider(row: { iangel_rider_key?: string | null }, riderKey: string) {
  const owner = String(row.iangel_rider_key || '').trim();
  if (!owner) return true;
  return owner === riderKey;
}

export function serviceIsBusy(activeKeys: string[], openTripKeys: Array<string | null>) {
  if (activeKeys.length === 0) return openTripKeys.length > 0;
  const taken = openTripKeys.filter((key) => key && activeKeys.includes(key)).length;
  const loose = openTripKeys.filter((key) => !key).length;
  return taken + loose >= activeKeys.length;
}

function isFresh(lastPingAt: string | null) {
  if (!lastPingAt) return false;
  const at = new Date(lastPingAt).getTime();
  return Number.isFinite(at) && Date.now() - at <= HEARTBEAT_STALE_MS;
}

export async function listRiderPresence() {
  const supabase = createAdminSupabase();
  const found = await supabase.from('iangel_rider_presence').select('*');
  if (found.error) return [] as RiderPresence[];
  return (found.data || []) as RiderPresence[];
}

export async function getRiderPresence(riderKey: string) {
  const key = riderKey.trim() || ANGEL_RIDER_KEY;
  const supabase = createAdminSupabase();
  const found = await supabase.from('iangel_rider_presence').select('*').eq('rider_key', key).maybeSingle();
  if (found.error || !found.data) {
    const inserted = await supabase
      .from('iangel_rider_presence')
      .insert({ rider_key: key, display_name: key === ANGEL_RIDER_KEY ? 'Angel' : 'Rider' })
      .select('*')
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    return inserted.data as RiderPresence;
  }
  return found.data as RiderPresence;
}

export async function saveRiderPresence(riderKey: string, patch: Record<string, unknown>) {
  const current = await getRiderPresence(riderKey);
  const supabase = createAdminSupabase();
  const updated = await supabase
    .from('iangel_rider_presence')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('rider_key', current.rider_key)
    .select('*')
    .single();
  if (updated.error) throw new Error(updated.error.message);
  return updated.data as RiderPresence;
}

export function activeRiderKeys(rows: RiderPresence[]) {
  return rows.filter((row) => row.rider_active === true && isFresh(row.last_ping_at)).map((row) => row.rider_key);
}

export async function mirrorServiceActive(anyoneActive: boolean) {
  const supabase = createAdminSupabase();
  await supabase
    .from('iangel_riders')
    .update({ rider_active: anyoneActive, updated_at: new Date().toISOString() })
    .eq('slug', 'las-vaqueras');
}

export function tripIsOpen(row: { dispatch_status?: string | null; status?: string | null }) {
  if (row.status === 'delivered' || row.status === 'cancelled') return false;
  return isActiveTrip(row.dispatch_status || null);
}
