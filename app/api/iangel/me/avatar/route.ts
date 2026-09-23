import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { mapRiderProfile, riderAvatarPublicUrl } from '@/lib/iangel-profile';
import { getOrCreateRider } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const MAX_BYTES = 3 * 1024 * 1024;

function extensionFor(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/heic' || type === 'image/heif') return 'heic';
  return 'jpg';
}

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return iangelJson(req, { error: 'Elige una foto de tu galería' }, 400);
  }
  if (file.size > MAX_BYTES) {
    return iangelJson(req, { error: 'La foto debe pesar menos de 3 MB' }, 400);
  }
  if (!ALLOWED.has(file.type)) {
    return iangelJson(req, { error: 'Usa una foto JPG, PNG o WebP' }, 400);
  }

  const rider = await getOrCreateRider();
  const supabase = createAdminSupabase();
  const path = `${rider.id}/${Date.now()}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const previousPath = (rider as { avatar_path?: string | null }).avatar_path || null;

  const uploaded = await supabase.storage.from('iangel-avatars').upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploaded.error) {
    return iangelJson(req, { error: uploaded.error.message }, 500);
  }

  const updated = await supabase
    .from('iangel_riders')
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq('id', rider.id)
    .select('*')
    .single();
  if (updated.error) {
    return iangelJson(req, { error: updated.error.message }, 500);
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from('iangel-avatars').remove([previousPath]);
  }

  const row = updated.data as typeof rider & { avatar_path?: string | null; emoji?: string | null };
  return iangelJson(req, {
    rider: mapRiderProfile(row),
    avatarUrl: riderAvatarPublicUrl(row.avatar_path),
  });
}
