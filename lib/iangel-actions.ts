import { isIangelShift, isIangelShiftEndWarning } from '@/lib/iangel-shift';
import { COPY } from '@/lib/iangel-copy';
import { etaMinutesBetween } from '@/lib/iangel-eta';
import { isNearDropoff, isNearStore } from '@/lib/iangel-geo';
import { CUSTOMER_WAIT_MS, CUSTOMER_WAIT_PAUSE_MS } from '@/lib/iangel-constants';
import { notifyOrderEvent } from '@/lib/order-chat';
import { sendRiderPush } from '@/lib/push-vapid';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { getOrCreateRider, writeAudit } from '@/lib/iangel-state';
import { RESTAURANT_INFO } from '@/lib/restaurant';

type Action =
  | 'accept'
  | 'pickup'
  | 'en_route'
  | 'arrive'
  | 'start_wait'
  | 'pause_wait'
  | 'deliver'
  | 'unclaimed'
  | 'unsafe_skip_wait'
  | 'incident'
  | 'rate_customer';

export async function releaseCookHolds() {
  const supabase = createAdminSupabase();
  const held = await supabase
    .from('orders')
    .select('id, short_code')
    .eq('cook_hold', true)
    .eq('dispatch_status', 'cook_hold')
    .neq('status', 'cancelled');
  for (const row of held.data || []) {
    await supabase
      .from('orders')
      .update({
        cook_hold: false,
        cook_hold_released_at: new Date().toISOString(),
        dispatch_status: 'self_iangel',
        delivery_provider: 'self',
      })
      .eq('id', row.id);
    await notifyOrderEvent({
      orderId: row.id,
      customerText: 'Cocina ya puede preparar tu pedido.',
      riderPush: {
        title: 'Hold liberado',
        body: `Ya puedes recoger #${row.short_code || ''}`.trim(),
      },
    });
  }
  if ((held.data || []).length > 0) {
    await sendRiderPush({ title: 'Ya puedes preparar', body: COPY.holdReady, tag: 'iangel-hold' });
  }
}

export async function runIangelAction(input: {
  orderId: string;
  action: Action;
  pin?: string;
  lat?: number;
  lng?: number;
  photoPath?: string;
  incidentType?: string;
  incidentNote?: string;
  stars?: number;
  comment?: string;
  accessOk?: boolean;
  noShow?: boolean;
}) {
  const supabase = createAdminSupabase();
  const rider = await getOrCreateRider();
  if (!rider.rider_active) {
    throw new Error('Estás INACTIVO. Actívate para continuar.');
  }
  const found = await supabase.from('orders').select('*').eq('id', input.orderId).maybeSingle();
  if (!found.data) throw new Error('Pedido no encontrado');
  const order = found.data as Record<string, unknown>;
  const lat = input.lat ?? (typeof rider.lat === 'number' ? rider.lat : null);
  const lng = input.lng ?? (typeof rider.lng === 'number' ? rider.lng : null);

  const patch: Record<string, unknown> = {};
  let customerText = '';
  let riderPush: { title: string; body: string } | undefined;

  if (input.action === 'accept') {
    patch.dispatch_status = 'assigned';
    patch.rider_status = 'assigned';
    customerText = 'IANGEL aceptó tu pedido.';
  } else if (input.action === 'pickup') {
    if (!lat || !lng || !isNearStore(lat, lng)) {
      throw new Error('Debes estar cerca de la tienda para marcar Recogí.');
    }
    if (String(order.pickup_pin || '') !== String(input.pin || '')) {
      throw new Error('PIN de recojo incorrecto.');
    }
    patch.dispatch_status = 'picked_up';
    patch.rider_status = 'picked_up';
    patch.status = 'in_transit';
    customerText = 'El rider ya recogió tu pedido y va en camino.';
    riderPush = { title: 'Pedido recogido', body: 'Wake lock: mantén la app abierta.' };
  } else if (input.action === 'en_route') {
    patch.dispatch_status = 'en_route';
    patch.status = 'in_transit';
    customerText = 'Tu pedido va en camino.';
  } else if (input.action === 'arrive') {
    const dropLat = Number(order.dropoff_lat);
    const dropLng = Number(order.dropoff_lng);
    if (!lat || !lng || !isNearDropoff(lat, lng, dropLat, dropLng)) {
      throw new Error('Debes estar a 150 m o menos del punto de entrega para marcar Llegué.');
    }
    patch.dispatch_status = 'arrived';
    patch.rider_lat = lat;
    patch.rider_lng = lng;
    customerText = order.leave_at_door
      ? 'El rider llegó. Dejará el pedido en la puerta.'
      : 'El rider llegó. Tienes 10 minutos para salir.';
  } else if (input.action === 'start_wait') {
    if (order.leave_at_door) throw new Error('Este pedido es dejar en la puerta: sin espera de 10 minutos.');
    patch.dispatch_status = 'waiting_customer';
    patch.wait_started_at = new Date().toISOString();
    customerText = 'Estoy aquí. Te espero 10 minutos.';
  } else if (input.action === 'pause_wait') {
    if (order.wait_pause_used) throw new Error('La pausa de 5 minutos ya se usó.');
    patch.wait_pause_used = true;
    patch.wait_paused_at = new Date().toISOString();
    customerText = 'El rider bajó un momento. Se agregan 5 minutos.';
  } else if (input.action === 'deliver' || input.action === 'unsafe_skip_wait') {
    patch.dispatch_status = 'delivered';
    patch.status = 'delivered';
    patch.rider_status = 'idle';
    customerText =
      input.action === 'unsafe_skip_wait'
        ? 'Entrega cerrada por zona insegura. No hubo espera.'
        : 'Pedido entregado.';
  } else if (input.action === 'unclaimed') {
    const started = order.wait_started_at ? new Date(String(order.wait_started_at)).getTime() : 0;
    const extra = order.wait_pause_used ? CUSTOMER_WAIT_PAUSE_MS : 0;
    if (!started || Date.now() < started + CUSTOMER_WAIT_MS + extra) {
      throw new Error('Aún no terminan los 10 minutos de espera.');
    }
    patch.dispatch_status = 'delivered_unclaimed';
    patch.status = 'delivered_unclaimed';
    customerText = 'No saliste a tiempo. El pedido se marcó sin reclamar; no hay reembolso.';
  } else if (input.action === 'incident') {
    patch.incident_type = input.incidentType || 'moto';
    patch.incident_note = input.incidentNote || '';
    patch.dispatch_status = 'needs_n8n_uber';
    customerText = 'Hubo un incidente con el envío. No pagarás otro envío. Reasignaremos Express cuando n8n esté activo.';
  } else if (input.action === 'rate_customer') {
    await supabase.from('order_ratings').upsert({
      order_id: input.orderId,
      direction: 'rider_to_customer',
      stars: input.stars || 5,
      comment: input.comment || null,
      access_ok: input.accessOk ?? null,
      no_show: input.noShow ?? false,
    });
  }

  if (lat != null && lng != null && Number(order.dropoff_lat) && Number(order.dropoff_lng)) {
    patch.eta_minutes = etaMinutesBetween(lat, lng, Number(order.dropoff_lat), Number(order.dropoff_lng));
    patch.rider_lat = lat;
    patch.rider_lng = lng;
  }

  if (Object.keys(patch).length) {
    const updated = await supabase.from('orders').update(patch).eq('id', input.orderId).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
  }

  await writeAudit({
    orderId: input.orderId,
    actor: 'rider',
    action: input.action,
    lat,
    lng,
    photoPath: input.photoPath,
    status: String(patch.status || patch.dispatch_status || ''),
    detail: { incidentType: input.incidentType, pinOk: input.action === 'pickup' },
  });

  if (customerText) {
    await notifyOrderEvent({
      orderId: input.orderId,
      customerText,
      riderPush,
      customerPush: { title: 'Las Vaqueras', body: customerText },
    });
  }

  if (input.action === 'deliver' || input.action === 'unclaimed' || input.action === 'unsafe_skip_wait') {
    await releaseCookHolds();
  }

  if (isIangelShiftEndWarning() && isIangelShift()) {
    const today = new Date().toISOString().slice(0, 10);
    if (rider.last_shift_warn_on !== today) {
      await supabase
        .from('iangel_riders')
        .update({ last_shift_warn_on: today })
        .eq('id', rider.id);
      await sendRiderPush({ title: 'IANGEL', body: COPY.shiftEndPush, tag: 'iangel-shift-end' });
    }
  }

  return { ok: true, store: { lat: RESTAURANT_INFO.pickupLat, lng: RESTAURANT_INFO.pickupLng } };
}
