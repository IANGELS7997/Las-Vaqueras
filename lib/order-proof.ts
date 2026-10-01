import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'order-proofs';

export function isHouseIangelRow(row: Record<string, unknown>) {
  if (String(row.fulfillment_type || '') === 'pickup') return false;
  const provider = String(row.delivery_provider || '');
  return provider === 'self' || provider === 'wait_self' || provider === '';
}

export async function saveOrderProof(
  supabase: SupabaseClient,
  orderId: string,
  kind: 'pickup' | 'dropoff',
  dataUrl: string
) {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error('La foto tiene que ser JPG, PNG o WebP');
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (bytes.length < 32 || bytes.length > 3_000_000) throw new Error('La foto debe pesar menos de 3 MB');
  const type = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  const path = `${orderId}/${kind}-${Date.now()}.${ext}`;
  const uploaded = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: type,
    upsert: false,
  });
  if (uploaded.error) throw new Error('No se guardó la foto');
  const at = new Date().toISOString();
  if (kind === 'pickup') return { pickup_photo_at: at, pickup_photo_path: path };
  return { dropoff_photo_at: at, dropoff_photo_path: path };
}
