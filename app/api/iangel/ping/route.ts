import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { COPY } from '@/lib/iangel-copy';
import { HEARTBEAT_STALE_MS, IANGEL_SLUG } from '@/lib/iangel-constants';
import { isIangelShift, isIangelShiftEndWarning } from '@/lib/iangel-shift';
import { getOrCreateRider } from '@/lib/iangel-state';
import { sendRiderPush } from '@/lib/push-vapid';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { lat?: number; lng?: number };
  const rider = await getOrCreateRider();
  const supabase = createAdminSupabase();
  const stale =
    rider.rider_active !== false &&
    rider.last_ping_at &&
    Date.now() - new Date(rider.last_ping_at).getTime() > HEARTBEAT_STALE_MS;
  await supabase
    .from('iangel_riders')
    .update({
      last_ping_at: new Date().toISOString(),
      lat: typeof body.lat === 'number' ? body.lat : rider.lat,
      lng: typeof body.lng === 'number' ? body.lng : rider.lng,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', IANGEL_SLUG);

  if (stale && rider.rider_active !== false) {
    await sendRiderPush({ title: 'IANGEL', body: COPY.stillActivePush, tag: 'iangel-still-active' });
  }
  if (isIangelShiftEndWarning() && isIangelShift() && rider.last_shift_warn_on !== new Date().toISOString().slice(0, 10)) {
    await supabase
      .from('iangel_riders')
      .update({ last_shift_warn_on: new Date().toISOString().slice(0, 10) })
      .eq('id', rider.id);
    await sendRiderPush({ title: 'IANGEL', body: COPY.shiftEndPush, tag: 'iangel-shift-end' });
  }

  return iangelJson(req, {
    ok: true,
    active: rider.rider_active !== false,
    inShift: isIangelShift(),
    autoInactivate: false,
  });
}
