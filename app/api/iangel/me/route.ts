import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { mapRiderProfile, RIDER_EMOJIS } from '@/lib/iangel-profile';
import { saveRiderPushSubscription } from '@/lib/iangel-push';
import { activeRiderKeys, getRiderPresence, listRiderPresence, mirrorServiceActive, saveRiderPresence } from '@/lib/iangel-presence';
import { getOrCreateRider } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { isIangelShift } from '@/lib/iangel-shift';
import { sendUberDirectNotice } from '@/lib/uber-direct-email';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

function mapRider(rider: Parameters<typeof mapRiderProfile>[0]) {
  const profile = mapRiderProfile(rider);
  return {
    active: profile.active,
    name: profile.name,
    uberDirect: profile.uberDirect,
    uberDirectAllowed: false,
    emoji: profile.emoji,
    avatarUrl: profile.avatarUrl,
  };
}

async function riderView(req: Request) {
  const key = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const [shared, presence] = await Promise.all([getOrCreateRider(), getRiderPresence(key)]);
  const view = mapRider(shared);
  const lock = String((presence as { help_lock_note?: string | null }).help_lock_note || '').trim();
  return {
    ...view,
    active: lock ? false : presence.rider_active === true,
    name: presence.display_name || view.name,
    uberDirectAllowed: key === ANGEL_RIDER_KEY,
    helpLock: lock || null,
  };
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  return iangelJson(req, {
    rider: await riderView(req),
    inShift: isIangelShift(),
    shiftCopy: null,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    emojiOptions: RIDER_EMOJIS,
  });
}

export async function PATCH(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    rider_active?: boolean;
    uber_direct_enabled?: boolean;
    push_subscription?: unknown;
    display_name?: string;
    emoji?: string;
  };
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const rider = await getOrCreateRider();
  if (typeof body.uber_direct_enabled === 'boolean' && riderKey !== ANGEL_RIDER_KEY) {
    return iangelJson(req, { error: 'Uber Direct solo lo activa Angel Salinas' }, 403);
  }
  const previousUber = rider.uber_direct_enabled === true;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.rider_active === 'boolean') {
    if (body.rider_active) {
      const presence = await getRiderPresence(riderKey);
      const lock = String((presence as { help_lock_note?: string | null }).help_lock_note || '').trim();
      if (lock) return iangelJson(req, { error: lock }, 409);
    }
    const presencePatch: Record<string, unknown> = { rider_active: body.rider_active };
    if (body.rider_active) presencePatch.last_ping_at = new Date().toISOString();
    await saveRiderPresence(riderKey, presencePatch);
    const live = activeRiderKeys(await listRiderPresence());
    await mirrorServiceActive(live.length > 0 || body.rider_active === true);
  }
  if (typeof body.uber_direct_enabled === 'boolean') {
    patch.uber_direct_enabled = body.uber_direct_enabled;
  }
  if (typeof body.display_name === 'string') {
    const name = body.display_name.trim().slice(0, 40);
    if (name.length >= 2) await saveRiderPresence(riderKey, { display_name: name });
  }
  if (typeof body.emoji === 'string') {
    const emoji = body.emoji.trim().slice(0, 8);
    if ((RIDER_EMOJIS as readonly string[]).includes(emoji) || emoji.length > 0) {
      patch.emoji = emoji || '🛵';
    }
  }
  if (body.push_subscription !== undefined) {
    try {
      await saveRiderPushSubscription(riderKey, body.push_subscription);
    } catch (err) {
      return iangelJson(req, { error: err instanceof Error ? err.message : 'No se guardó push' }, 500);
    }
  }

  if (Object.keys(patch).length > 1) {
    const supabase = createAdminSupabase();
    const updated = await supabase.from('iangel_riders').update(patch).eq('id', rider.id).select('*').single();
    if (updated.error) {
      return iangelJson(req, { error: updated.error.message }, 500);
    }
    const row = updated.data as typeof rider;
    if (typeof body.uber_direct_enabled === 'boolean' && row.uber_direct_enabled !== body.uber_direct_enabled) {
      return iangelJson(req, { error: 'No se pudo confirmar Uber Direct' }, 500);
    }
    if (typeof body.uber_direct_enabled === 'boolean' && previousUber !== body.uber_direct_enabled) {
      void sendUberDirectNotice({
        enabled: body.uber_direct_enabled,
        actor: 'Angel Salinas · 6141812108',
      }).catch(() => undefined);
    }
  }

  return iangelJson(req, {
    rider: await riderView(req),
    inShift: isIangelShift(),
    shiftCopy: null,
  });
}
