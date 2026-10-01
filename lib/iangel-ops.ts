import { RESTAURANT_INFO } from '@/lib/restaurant';

const DEFAULT_URL = 'https://fcuknxeakjbpqevlwswu.supabase.co/functions/v1/iangel-ops';
const SLUG = 'las-vaqueras';
const PICKED_UP = new Set(['picked_up', 'en_route', 'arrived', 'waiting_customer']);

export type IangelOpsRow = {
  id: string;
  customer_name?: string | null;
  delivery_address?: string | null;
  total_charged?: number | string | null;
  created_at?: string | null;
  fulfillment_type?: string | null;
  delivery_provider?: string | null;
  dropoff_lat?: number | string | null;
  dropoff_lng?: number | string | null;
  dispatch_status?: string | null;
  pay_method?: string | null;
  cash_food_due?: number | string | null;
};

function opsUrl() {
  return (process.env.IANGEL_OPS_URL || DEFAULT_URL).replace(/\/$/, '');
}

export function isIangelDelivery(row: IangelOpsRow) {
  const provider = String(row.delivery_provider || '');
  if (provider !== 'self' && provider !== 'wait_self') return false;
  if (String(row.fulfillment_type || '') === 'pickup') return false;
  return Number.isFinite(Number(row.dropoff_lat)) && Number.isFinite(Number(row.dropoff_lng));
}

function isIangelProvider(row: IangelOpsRow) {
  const provider = String(row.delivery_provider || '');
  return (provider === 'self' || provider === 'wait_self') && String(row.fulfillment_type || '') !== 'pickup';
}

async function postOps(body: Record<string, unknown>) {
  const key = process.env.IANGEL_OPS_WEBHOOK_SECRET || '';
  if (!key) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const response = await fetch(opsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': key,
      },
      body: JSON.stringify({ businessSlug: SLUG, ...body }),
      signal: ctrl.signal,
    });
    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    if (!response.ok || !payload || payload.ok === false) return null;
    return payload;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Avisa al panel cuando nace un domicilio IANGEL. Un fallo no frena el cobro. */
export async function notifyIangelOpsOrder(row: IangelOpsRow) {
  if (!isIangelDelivery(row)) return;
  const payMethod = row.pay_method === 'cash' || row.pay_method === 'card' ? row.pay_method : undefined;
  const food = Number(row.cash_food_due);
  await postOps({
    action: 'order',
    externalId: row.id,
    customerName: row.customer_name || '',
    address: row.delivery_address || '',
    total: Number(row.total_charged || 0),
    pickup: { lat: RESTAURANT_INFO.pickupLat, lng: RESTAURANT_INFO.pickupLng },
    dropoff: { lat: Number(row.dropoff_lat), lng: Number(row.dropoff_lng) },
    pickupLabel: RESTAURANT_INFO.pickupStreet,
    createdAt: row.created_at || new Date().toISOString(),
    ...(payMethod ? { payMethod } : {}),
    ...(payMethod === 'cash' && Number.isFinite(food) && food > 0 ? { cashFoodDue: food, feeMxn: 50 } : {}),
  });
}

export async function markIangelDoorCollected(
  row: IangelOpsRow,
  note: { paymentStatus: string; paymentNote: string; cashFoodDue: number }
) {
  if (!isIangelProvider(row)) return;
  await postOps({
    action: 'order-event',
    externalId: row.id,
    paymentStatus: note.paymentStatus,
    paymentNote: note.paymentNote,
    cashFoodDue: note.cashFoodDue,
    payMethod: 'cash',
  });
}

export async function closeIangelOpsOrder(
  row: IangelOpsRow,
  status: 'delivered' | 'cancelled',
  fee?: Record<string, unknown> | null
) {
  if (!isIangelProvider(row)) return;
  await postOps({
    action: 'order-event',
    externalId: row.id,
    status,
    ...(status === 'delivered' && fee ? fee : {}),
  });
}

export async function sequenceIangelOps(here: { lat: number; lng: number }, rows: IangelOpsRow[]) {
  const orders = rows.filter(isIangelDelivery).map((row) => ({
    id: row.id,
    pickup: { lat: RESTAURANT_INFO.pickupLat, lng: RESTAURANT_INFO.pickupLng },
    dropoff: { lat: Number(row.dropoff_lat), lng: Number(row.dropoff_lng) },
    pickedUp: PICKED_UP.has(String(row.dispatch_status || '')),
    createdAt: row.created_at || '',
  }));
  if (orders.length === 0) return { orderIds: [] as string[], etaMinutes: {} as Record<string, number> };
  const payload = await postOps({ action: 'sequence', here, orders });
  const stops = payload && Array.isArray(payload.stops) ? payload.stops : null;
  if (!stops) return null;
  const orderIds: string[] = [];
  const etaMinutes: Record<string, number> = {};
  for (const stop of stops) {
    if (!stop || typeof stop !== 'object') continue;
    const id = String((stop as { orderId?: unknown }).orderId || '');
    const eta = Number((stop as { etaMinutes?: unknown }).etaMinutes);
    if (!id) continue;
    orderIds.push(id);
    if (Number.isFinite(eta)) etaMinutes[id] = eta;
  }
  const known = new Set(orderIds);
  for (const row of rows) {
    if (!known.has(row.id)) orderIds.push(row.id);
  }
  return { orderIds, etaMinutes };
}

export async function identifyRiderAccessToken(accessToken: string) {
  const token = accessToken.trim();
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const response = await fetch(opsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'whoami' }),
      signal: ctrl.signal,
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      id?: string;
      displayName?: string;
    } | null;
    const id = String(payload?.id || '').trim();
    if (!response.ok || !payload || payload.ok === false || !id) return null;
    return { id, displayName: String(payload.displayName || 'Rider') };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function locateIangelRider(riderKey: string, lat: number, lng: number) {
  await postOps({ action: 'locate', riderKey, lat, lng });
}

export async function notifyIangelHelp(report: Record<string, unknown>) {
  await postOps({ action: 'help-sync', ...report });
}
