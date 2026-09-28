import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { sequenceIangelOps, type IangelOpsRow } from '@/lib/iangel-ops';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { lat?: unknown; lng?: unknown };
  const supabase = createAdminSupabase();
  const queued = await supabase
    .from('orders')
    .select(
      'id, created_at, dropoff_lat, dropoff_lng, delivery_provider, fulfillment_type, dispatch_status, customer_name, delivery_address, total_charged'
    )
    .in('delivery_provider', ['self', 'wait_self'])
    .in('status', ['pending', 'preparing', 'in_transit'])
    .order('created_at', { ascending: true })
    .limit(20);

  if (queued.error) return iangelJson(req, { error: queued.error.message }, 500);

  const rows = ((queued.data || []) as IangelOpsRow[]).filter(
    (row) => row.dispatch_status !== 'delivered' && row.dispatch_status !== 'incident'
  );
  const fifo = rows.map((row) => row.id);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const here =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : { lat: RESTAURANT_INFO.pickupLat, lng: RESTAURANT_INFO.pickupLng };
  const planned = await sequenceIangelOps(here, rows);
  if (!planned) return iangelJson(req, { orderIds: fifo, etaMinutes: {}, source: 'fifo' });
  return iangelJson(req, {
    orderIds: planned.orderIds,
    etaMinutes: planned.etaMinutes,
    source: 'ops',
  });
}
