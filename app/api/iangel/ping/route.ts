import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { getOrCreateRider } from '@/lib/iangel-state';
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
  // Heartbeat solo cuenta si el rider está conectado; evita “online fantasma” tras OFF.
  if (rider.rider_active !== true) {
    return iangelJson(req, { ok: true, active: false });
  }
  const patch: Record<string, unknown> = {
    last_ping_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (Number.isFinite(body.lat) && Number.isFinite(body.lng)) {
    patch.lat = Number(body.lat);
    patch.lng = Number(body.lng);
  }
  const supabase = createAdminSupabase();
  const updated = await supabase.from('iangel_riders').update(patch).eq('id', rider.id);
  if (updated.error) {
    return iangelJson(req, { error: updated.error.message }, 500);
  }
  return iangelJson(req, { ok: true, active: true });
}
