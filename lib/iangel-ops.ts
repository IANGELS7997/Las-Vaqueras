import { branchById } from '@/lib/branches';
import { kitchenStatusLabel } from '@/lib/order-lifecycle';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import type { CartItem, OrderStatus } from '@/types';

const DEFAULT_URL = 'https://fcuknxeakjbpqevlwswu.supabase.co/functions/v1/iangel-ops';
const SLUG = 'las-vaqueras';
const PICKED_UP = new Set(['picked_up', 'en_route', 'arrived', 'waiting_customer']);
const KITCHEN_STATUSES = new Set<OrderStatus>(['pending', 'preparing', 'in_transit', 'delivered', 'cancelled']);

export type IangelOpsRow = {
  id: string;
  status?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_references?: string | null;
  leave_at_door?: boolean | null;
  total_charged?: number | string | null;
  delivery_fee?: number | string | null;
  created_at?: string | null;
  fulfillment_type?: string | null;
  delivery_provider?: string | null;
  dropoff_lat?: number | string | null;
  dropoff_lng?: number | string | null;
  dispatch_status?: string | null;
  pay_method?: string | null;
  cash_food_due?: number | string | null;
  pickup_at?: string | null;
  short_code?: string | null;
  branch_id?: string | null;
  items?: unknown;
};

export type OpsTicketLine = {
  name: string;
  quantity: number;
  extras: string[];
  removals: string[];
  note: string | null;
};

export type OpsTicketKind = 'recoger' | 'iangel' | 'esperar' | 'gestionar';

export type OpsTicket = {
  code: string;
  branch: string;
  branchLabel: string;
  kind: OpsTicketKind;
  kindLabel: string;
  phone: string;
  references: string | null;
  leaveAtDoor: boolean;
  pickupAt: string | null;
  items: OpsTicketLine[];
  foodMxn: number;
  deliveryMxn: number;
  totalMxn: number;
  payMethod: 'card' | 'cash' | null;
};

export type IangelOpsOrderNotice = {
  externalId: string;
  customerName: string;
  address: string;
  total: number;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  pickupLabel: string;
  createdAt: string;
  channel: 'cocina' | null;
  kitchenStatus: string;
  payMethod?: 'card' | 'cash';
  cashFoodDue?: number;
  feeMxn?: number;
  ticket: OpsTicket;
};

function opsUrl() {
  return (process.env.IANGEL_OPS_URL || DEFAULT_URL).replace(/\/$/, '');
}

function isIangelProvider(row: IangelOpsRow) {
  const provider = String(row.delivery_provider || '');
  return (provider === 'self' || provider === 'wait_self') && String(row.fulfillment_type || '') !== 'pickup';
}

export function isIangelDelivery(row: IangelOpsRow) {
  if (!isIangelProvider(row)) return false;
  return Number.isFinite(Number(row.dropoff_lat)) && Number.isFinite(Number(row.dropoff_lng));
}

function money(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
}

function coord(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function kindOf(row: IangelOpsRow): { kind: OpsTicketKind; kindLabel: string; rider: boolean } {
  if (String(row.fulfillment_type || '') === 'pickup') {
    return { kind: 'recoger', kindLabel: 'Recoger', rider: false };
  }
  const provider = String(row.delivery_provider || '');
  if (provider === 'self') return { kind: 'iangel', kindLabel: 'IANGEL', rider: true };
  if (provider === 'wait_self') return { kind: 'esperar', kindLabel: 'Esperar rider', rider: true };
  return { kind: 'gestionar', kindLabel: 'Gestionar pedido', rider: false };
}

function ticketLines(items: unknown): OpsTicketLine[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 40).map((raw) => {
    const item = (raw || {}) as Partial<CartItem>;
    const extras = Array.isArray(item.extras)
      ? item.extras.map((extra) => String(extra?.name || '').trim()).filter(Boolean).slice(0, 12)
      : [];
    const removals = Array.isArray(item.removals)
      ? item.removals.map((name) => String(name || '').trim()).filter(Boolean).slice(0, 12)
      : [];
    const qty = Number(item.quantity);
    const note = String(item.specialInstructions || '').trim();
    return {
      name: String(item.name || 'Platillo').trim() || 'Platillo',
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      extras,
      removals,
      note: note ? note.slice(0, 180) : null,
    };
  });
}

export function kitchenStatusForOps(row: IangelOpsRow) {
  const status = String(row.status || 'preparing');
  const known = KITCHEN_STATUSES.has(status as OrderStatus) ? (status as OrderStatus) : 'preparing';
  return kitchenStatusLabel(known, row.fulfillment_type);
}

/** Pedido pagado listo para el panel. Recoger y Gestionar llevan canal cocina. IANGEL no, para que el rider lo siga viendo. */
export function buildIangelOpsOrder(row: IangelOpsRow): IangelOpsOrderNotice | null {
  const id = String(row.id || '').trim();
  if (!id || String(row.status || '') === 'awaiting_payment') return null;

  const branch = branchById(row.branch_id);
  const kind = kindOf(row);
  const dropLat = coord(row.dropoff_lat);
  const dropLng = coord(row.dropoff_lng);
  const hasDropoff = dropLat != null && dropLng != null;
  const rider = kind.rider && hasDropoff;
  const total = money(row.total_charged);
  const delivery = money(row.delivery_fee);
  const food = Math.max(0, Math.round((total - delivery) * 100) / 100);
  const payMethod = row.pay_method === 'cash' || row.pay_method === 'card' ? row.pay_method : null;
  const code = String(row.short_code || '').trim() || id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const address =
    kind.kind === 'recoger' ? branch.address : String(row.delivery_address || '').trim() || branch.address;
  const cashFood = money(row.cash_food_due);

  return {
    externalId: id,
    customerName: String(row.customer_name || '').trim(),
    address,
    total,
    pickup: { lat: branch.lat, lng: branch.lng },
    dropoff:
      hasDropoff && kind.kind !== 'recoger'
        ? { lat: dropLat as number, lng: dropLng as number }
        : { lat: branch.lat, lng: branch.lng },
    pickupLabel: branch.street,
    createdAt: String(row.created_at || '').trim() || new Date().toISOString(),
    channel: rider ? null : 'cocina',
    kitchenStatus: kitchenStatusForOps(row),
    ...(payMethod ? { payMethod } : {}),
    ...(rider && payMethod === 'cash' && cashFood > 0 ? { cashFoodDue: cashFood, feeMxn: 50 } : {}),
    ticket: {
      code,
      branch: branch.id,
      branchLabel: branch.shortName,
      kind: kind.kind,
      kindLabel: kind.kindLabel,
      phone: String(row.customer_phone || '').trim(),
      references: String(row.delivery_references || '').trim() || null,
      leaveAtDoor: row.leave_at_door === true,
      pickupAt: kind.kind === 'recoger' ? String(row.pickup_at || '').trim() || null : null,
      items: ticketLines(row.items),
      foodMxn: food,
      deliveryMxn: delivery,
      totalMxn: total,
      payMethod,
    },
  };
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

/** Avisa al panel cuando nace un pedido pagado. Un fallo no frena el cobro. */
export async function notifyIangelOpsOrder(row: IangelOpsRow) {
  const notice = buildIangelOpsOrder(row);
  if (!notice) return;
  const { channel, ...rest } = notice;
  await postOps({
    action: 'order',
    ...rest,
    ...(channel ? { channel } : {}),
  });
}

export async function syncIangelOpsKitchen(row: IangelOpsRow) {
  const id = String(row.id || '').trim();
  if (!id || String(row.status || '') === 'awaiting_payment') return;
  const status = String(row.status || '');
  const closing = status === 'delivered' || status === 'cancelled' ? status : null;
  await postOps({
    action: 'order-event',
    externalId: id,
    kitchenStatus: kitchenStatusForOps(row),
    ...(closing ? { status: closing } : {}),
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
  const id = String(row.id || '').trim();
  if (!id) return;
  await postOps({
    action: 'order-event',
    externalId: id,
    status,
    kitchenStatus: kitchenStatusLabel(status, row.fulfillment_type),
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
