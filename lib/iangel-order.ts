import { patchFromRiderAction } from '@/lib/order-lifecycle';

export type IangelOrder = {
  id: string;
  shortCode: string | null;
  pickupPin: string | null;
  status: string;
  dispatchStatus: string | null;
  cookHold: boolean;
  cookHoldReleasedAt: string | null;
  leaveAtDoor: boolean;
  gatedCommunity: boolean;
  dropoffLat: number | null;
  dropoffLng: number | null;
  etaMinutes: number | null;
  estimatedMinutes: number;
  waitStartedAt: string | null;
  notes: string | null;
  items: { name: string; qty: number }[];
  customer: { name: string; phone: string; address: string; phoneAlt?: string };
  total: number;
  createdAt: string | null;
};

function asItems(raw: unknown): { name: string; qty: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { name?: unknown; qty?: unknown; quantity?: unknown; specialInstructions?: unknown };
      const name = String(row.name || '').trim();
      const qty = Number(row.qty ?? row.quantity ?? 1);
      if (!name) return null;
      const note = String(row.specialInstructions || '').trim();
      const label = note ? `${name} (${note})` : name;
      return { name: label, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 };
    })
    .filter((item): item is { name: string; qty: number } => Boolean(item));
}

/** Comentario del cliente en checkout, sin la línea técnica de GPS. */
export function customerNotesFromReferences(raw: unknown): string | null {
  const text = String(raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^Ubicaci[oó]n:/i.test(line))
    .join('\n')
    .trim();
  return text || null;
}

export function mapIangelOrder(row: Record<string, unknown>): IangelOrder {
  const id = String(row.id);
  const short =
    (row.short_code as string | null) ||
    id.replace(/-/g, '').slice(0, 4).toUpperCase();
  return {
    id,
    shortCode: short,
    pickupPin: null,
    status: String(row.status || 'pending'),
    dispatchStatus: (row.dispatch_status as string | null) || null,
    cookHold: Boolean(row.cook_hold),
    cookHoldReleasedAt: (row.cook_hold_released_at as string | null) || null,
    leaveAtDoor: Boolean(row.leave_at_door),
    gatedCommunity: Boolean(row.gated_community),
    dropoffLat: row.dropoff_lat == null ? null : Number(row.dropoff_lat),
    dropoffLng: row.dropoff_lng == null ? null : Number(row.dropoff_lng),
    etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
    estimatedMinutes: row.eta_minutes == null ? 12 : Number(row.eta_minutes),
    waitStartedAt: (row.wait_started_at as string | null) || null,
    notes: customerNotesFromReferences(row.delivery_references),
    items: asItems(row.items),
    customer: {
      name: String(row.customer_name || ''),
      phone: String(row.customer_phone || ''),
      address: String(row.delivery_address || ''),
      phoneAlt: (row.customer_phone_alt as string | undefined) || undefined,
    },
    total: Number(row.total_charged || 0),
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
  };
}

const ACTIVE_TRIP = new Set(['assigned', 'picked_up', 'en_route', 'arrived', 'waiting_customer']);

export function isActiveTrip(dispatchStatus: string | null) {
  return Boolean(dispatchStatus && ACTIVE_TRIP.has(dispatchStatus));
}

export async function runIangelOrderAction(order: Record<string, unknown>, action: string, _pin?: string) {
  if (Boolean(order.cook_hold) && !order.cook_hold_released_at && (action === 'pickup' || action === 'en_route')) {
    throw new Error('Cocina pidió espera. No inicies el viaje todavía.');
  }
  return patchFromRiderAction(
    action,
    {
      status: String(order.status || ''),
      dispatchStatus: (order.dispatch_status as string | null) || null,
      fulfillment: (order.fulfillment_type as string | null) || 'delivery',
      cookHold: Boolean(order.cook_hold),
      leaveAtDoor: Boolean(order.leave_at_door),
      pickupPin: null,
      etaMinutes: order.eta_minutes == null ? null : Number(order.eta_minutes),
    },
    undefined
  );
}
