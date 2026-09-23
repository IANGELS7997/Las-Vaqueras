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
  const patch: Record<string, unknown> = {
    last_ping_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (Number.isFinite(body.lat) && Number.isFinite(body.lng)) {
    patch.lat = Number(body.lat);
    patch.lng = Number(body.lng);
  }
  const supabase = createAdminSupabase();
  await supabase.from('iangel_riders').update(patch).eq('id', rider.id);
  return iangelJson(req, { ok: true });
}
