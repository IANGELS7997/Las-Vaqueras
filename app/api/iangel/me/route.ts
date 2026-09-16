import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { COPY } from '@/lib/iangel-copy';
import { isIangelShift } from '@/lib/iangel-shift';
import { getOrCreateRider, writeAudit } from '@/lib/iangel-state';
import { sendRiderPush } from '@/lib/push-vapid';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const rider = await getOrCreateRider();
  return iangelJson(req, {
    rider: {
      active: rider.rider_active !== false,
      lastPingAt: rider.last_ping_at,
      lat: rider.lat,
      lng: rider.lng,
      name: rider.display_name,
    },
    inShift: isIangelShift(),
    shiftCopy: isIangelShift() ? null : COPY.shiftClosedBanner,
  });
}

export async function PATCH(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { rider_active?: boolean; push_subscription?: unknown };
  const rider = await getOrCreateRider();
  const supabase = createAdminSupabase();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.rider_active === 'boolean') {
    patch.rider_active = body.rider_active;
  }
  if (body.push_subscription) patch.push_subscription = body.push_subscription;
  await supabase.from('iangel_riders').update(patch).eq('id', rider.id);
  if (body.rider_active === false) {
    await writeAudit({ actor: 'rider', action: 'set_inactive' });
    await sendRiderPush({ title: 'IANGEL', body: 'Pasaste a INACTIVO', tag: 'iangel-inactive' });
  }
  const next = await getOrCreateRider();
  return iangelJson(req, { ok: true, active: next.rider_active !== false });
}
