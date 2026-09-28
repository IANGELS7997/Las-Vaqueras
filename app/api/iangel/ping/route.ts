import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { locateIangelRider } from '@/lib/iangel-ops';
import { getRiderPresence, saveRiderPresence } from '@/lib/iangel-presence';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { lat?: number; lng?: number };
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const rider = await getRiderPresence(riderKey);
  if (rider.rider_active !== true) {
    return iangelJson(req, { ok: true, active: false });
  }
  const patch: Record<string, unknown> = { last_ping_at: new Date().toISOString() };
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    patch.lat = lat;
    patch.lng = lng;
    void locateIangelRider(riderKey, lat, lng);
  }
  try {
    await saveRiderPresence(riderKey, patch);
  } catch (err) {
    return iangelJson(req, { error: err instanceof Error ? err.message : 'No se guardó la ubicación' }, 500);
  }
  return iangelJson(req, { ok: true, active: true });
}
