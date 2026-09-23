import webpush from 'web-push';
import { getOrCreateRider } from '@/lib/iangel-state';
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

export async function saveRiderPushSubscription(subscription: unknown) {
  const rider = await getOrCreateRider();
  const supabase = createAdminSupabase();
  const { error } = await supabase
    .from('iangel_riders')
    .update({
      push_subscription: subscription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rider.id);
  if (error) throw new Error(error.message);
}

export async function notifyIangelRider(payload: PushPayload) {
  if (!configureVapid()) return { ok: false, reason: 'vapid_missing' as const };
  const rider = await getOrCreateRider();
  const sub = rider.push_subscription as webpush.PushSubscription | null;
  if (!sub || typeof sub !== 'object') return { ok: false, reason: 'no_subscription' as const };

  try {
    await webpush.sendNotification(
      sub,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: payload.tag || 'iangel',
      })
    );
    return { ok: true as const };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      const supabase = createAdminSupabase();
      await supabase.from('iangel_riders').update({ push_subscription: null }).eq('id', rider.id);
    }
    return { ok: false, reason: 'send_failed' as const };
  }
}

export async function notifyIangelNewOrder(input: { code?: string | null; customer?: string | null }) {
  const rider = await getOrCreateRider();
  // Solo avisar si el rider está explícitamente en línea (no push a sesión OFF).
  if (rider.rider_active !== true) {
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
