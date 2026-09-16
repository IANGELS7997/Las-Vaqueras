import { DISPATCH_ACTIVE_TRIP, HEARTBEAT_STALE_MS, IANGEL_SLUG } from '@/lib/iangel-constants';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type RiderRow = {
  id: string;
  slug: string;
  display_name: string;
  rider_active: boolean;
  last_ping_at: string | null;
  last_stale_push_at: string | null;
  last_shift_warn_on: string | null;
  lat: number | null;
  lng: number | null;
  push_subscription: unknown;
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
    .eq('delivery_provider', 'self')
    .in('dispatch_status', [...DISPATCH_ACTIVE_TRIP])
    .limit(1);
  if (active.data && active.data.length > 0) return true;
  const waitAccepted = await supabase
    .from('orders')
    .select('id')
    .eq('delivery_provider', 'wait_self')
    .in('dispatch_status', [...DISPATCH_ACTIVE_TRIP])
    .limit(1);
  return Boolean(waitAccepted.data && waitAccepted.data.length > 0);
}

export async function getRoutingRiderFlags() {
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
}

export async function writeAudit(input: {
  orderId?: string | null;
  actor: string;
  action: string;
  lat?: number | null;
  lng?: number | null;
  photoPath?: string | null;
  status?: string | null;
  detail?: Record<string, unknown>;
}) {
  const supabase = createAdminSupabase();
  await supabase.from('order_audit').insert({
    order_id: input.orderId || null,
    actor: input.actor,
    action: input.action,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    photo_path: input.photoPath ?? null,
    status: input.status ?? null,
    detail: input.detail || {},
  });
}

export function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function randomShortCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
