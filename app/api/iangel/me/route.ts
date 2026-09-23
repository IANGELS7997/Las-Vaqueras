import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { saveRiderPushSubscription } from '@/lib/iangel-push';
import { getOrCreateRider } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { isIangelShift } from '@/lib/iangel-shift';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

function mapRider(rider: {
  display_name?: string | null;
  rider_active?: boolean | null;
  uber_direct_enabled?: boolean | null;
}) {
  return {
    active: rider.rider_active === true,
    name: rider.display_name || 'Rider',
    uberDirect: rider.uber_direct_enabled === true,
  };
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const rider = await getOrCreateRider();
  return iangelJson(req, {
    rider: mapRider(rider),
    inShift: isIangelShift(),
    shiftCopy: null,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
}

export async function PATCH(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    rider_active?: boolean;
    uber_direct_enabled?: boolean;
    push_subscription?: unknown;
  };
  const rider = await getOrCreateRider();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.rider_active === 'boolean') {
    patch.rider_active = body.rider_active;
    // Conectar: marca heartbeat ya. Desconectar: corta disponibilidad al instante.
    if (body.rider_active) patch.last_ping_at = new Date().toISOString();
  }
  if (typeof body.uber_direct_enabled === 'boolean') {
    patch.uber_direct_enabled = body.uber_direct_enabled;
  }
  if (body.push_subscription !== undefined) {
    try {
      await saveRiderPushSubscription(body.push_subscription);
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
    if (typeof body.rider_active === 'boolean' && row.rider_active !== body.rider_active) {
      return iangelJson(req, { error: 'No se pudo confirmar conexión IANGEL' }, 500);
    }
    if (typeof body.uber_direct_enabled === 'boolean' && row.uber_direct_enabled !== body.uber_direct_enabled) {
      return iangelJson(req, { error: 'No se pudo confirmar Uber Direct' }, 500);
    }
    return iangelJson(req, {
      rider: mapRider(row),
      inShift: isIangelShift(),
      shiftCopy: null,
    });
  }

  const fresh = await getOrCreateRider();
  return iangelJson(req, {
    rider: mapRider(fresh),
    inShift: isIangelShift(),
    shiftCopy: null,
  });
}
