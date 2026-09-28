import webpush from 'web-push';
import { getOrCreateRider } from '@/lib/iangel-state';
import { listRiderPresence, saveRiderPresence } from '@/lib/iangel-presence';
import { createAdminSupabase } from '@/lib/supabase-admin';

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function configureVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@lasvaqueras.com.mx';
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey };
}

export async function saveRiderPushSubscription(riderKey: string, subscription: unknown) {
  await saveRiderPresence(riderKey, { push_subscription: subscription });
}

async function sendOne(riderKey: string, sub: webpush.PushSubscription, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: payload.tag || 'iangel',
      }),
      { TTL: 12 * 60 * 60, urgency: 'high' }
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await saveRiderPresence(riderKey, { push_subscription: null }).catch(() => undefined);
    }
    return false;
  }
}

export async function notifyIangelRider(payload: PushPayload) {
  if (!configureVapid()) return { ok: false, reason: 'vapid_missing' as const };
  const people = (await listRiderPresence()).filter((row) => row.rider_active === true && row.push_subscription);
  const targets = people.length > 0 ? people : [];
  if (targets.length === 0) {
    const rider = await getOrCreateRider();
    const sub = rider.push_subscription as webpush.PushSubscription | null;
    if (!sub || typeof sub !== 'object' || rider.rider_active !== true) {
      return { ok: false, reason: 'no_subscription' as const };
    }
    const supabase = createAdminSupabase();
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 12 * 60 * 60, urgency: 'high' });
      return { ok: true as const };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from('iangel_riders').update({ push_subscription: null }).eq('id', rider.id);
      }
      return { ok: false, reason: 'send_failed' as const };
    }
  }
  let sent = 0;
  for (const row of targets) {
    const sub = row.push_subscription as webpush.PushSubscription;
    if (!sub || typeof sub !== 'object') continue;
    if (await sendOne(row.rider_key, sub, payload)) sent += 1;
  }
  return sent > 0 ? { ok: true as const } : { ok: false, reason: 'send_failed' as const };
}

export async function notifyIangelNewOrder(input: { code?: string | null; customer?: string | null }) {
  const people = await listRiderPresence();
  const online = people.some((row) => row.rider_active === true);
  const legacy = online ? null : await getOrCreateRider();
  if (!online && legacy?.rider_active !== true) {
    return { ok: false, reason: 'rider_offline' as const };
  }
  const code = input.code ? `#${String(input.code).replace(/^#/, '')}` : 'Nuevo';
  const who = input.customer?.trim() || 'Cliente';
  return notifyIangelRider({
    title: 'Nuevo pedido IANGEL',
    body: `${code} · ${who}. Recibiste un nuevo pedido.`,
    url: '/',
    tag: `order-${code}`,
  });
}
