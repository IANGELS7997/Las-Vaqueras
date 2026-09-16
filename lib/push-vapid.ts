import { createAdminSupabase } from '@/lib/supabase-admin';

export type PushAudience = 'rider' | 'customer';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

async function webPushSend(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  const subject = process.env.VAPID_SUBJECT || 'mailto:servicio@lasvaqueras.com.mx';
  if (!publicKey || !privateKey) return { ok: false as const, skipped: true };
  try {
    const webpush = await import('web-push');
    webpush.setVapidDetails(subject, publicKey, privateKey);
    await webpush.sendNotification(sub, payload);
    return { ok: true as const, skipped: false };
  } catch {
    return { ok: false as const, skipped: false };
  }
}

export async function savePushSubscription(input: {
  audience: PushAudience;
  endpoint: string;
  p256dh: string;
  auth: string;
  customerId?: string | null;
  orderId?: string | null;
}) {
  const supabase = createAdminSupabase();
  await supabase.from('push_subscriptions').upsert(
    {
      audience: input.audience,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      customer_id: input.customerId || null,
      order_id: input.orderId || null,
    },
    { onConflict: 'endpoint' }
  );
}

export async function sendPushToAudience(audience: PushAudience, payload: PushPayload, orderId?: string) {
  const supabase = createAdminSupabase();
  let query = supabase.from('push_subscriptions').select('endpoint, p256dh, auth, order_id').eq('audience', audience);
  if (audience === 'customer' && orderId) query = query.eq('order_id', orderId);
  const { data } = await query;
  const body = JSON.stringify(payload);
  for (const row of data || []) {
    await webPushSend(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      body
    );
  }
}

export async function sendRiderPush(payload: PushPayload) {
  const supabase = createAdminSupabase();
  const rider = await supabase.from('iangel_riders').select('push_subscription').eq('slug', 'las-vaqueras').maybeSingle();
  const sub = rider.data?.push_subscription as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | null;
  if (sub?.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
    await webPushSend(
      { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      JSON.stringify(payload)
    );
  }
  await sendPushToAudience('rider', payload);
}

export async function sendCustomerOrderPush(orderId: string, payload: PushPayload) {
  return sendPushToAudience('customer', payload, orderId);
}
