import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { avatarPublicUrl } from '@/lib/customers';
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

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) {
    return NextResponse.json({ error: 'Entra a tu perfil primero' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Elige una foto de tu galería' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'La foto debe pesar menos de 3 MB' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Usa una foto JPG, PNG o WebP' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const path = `${customerId}/${Date.now()}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const current = await supabase.from('customers').select('avatar_path').eq('id', customerId).maybeSingle();
  const uploaded = await supabase.storage.from('customer-avatars').upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (uploaded.error) {
    return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
  }

  const updated = await supabase
    .from('customers')
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq('id', customerId)
    .select('avatar_path')
    .single();
  if (updated.error) {
    return NextResponse.json({ error: updated.error.message }, { status: 500 });
  }

  if (current.data?.avatar_path && current.data.avatar_path !== path) {
    await supabase.storage.from('customer-avatars').remove([current.data.avatar_path]);
  }

  return NextResponse.json({ avatarUrl: avatarPublicUrl(updated.data.avatar_path) });
}
