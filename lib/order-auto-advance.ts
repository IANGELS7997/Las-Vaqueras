import type { createAdminSupabase } from '@/lib/supabase-admin';
import type { DbOrderRow } from '@/lib/orders-map';

type Client = ReturnType<typeof createAdminSupabase>;

/** Punto medio del rango comunicado (10–15 min) para “listo para recoger”. */
export const PICKUP_AUTO_READY_MINUTES = 12;

/** Tras listo: si nadie marca recogido, cierra el pedido solo. */
export const PICKUP_AUTO_DELIVERED_MINUTES_AFTER_READY = 30;

function ageMinutes(createdAt: string | null | undefined, nowMs: number): number {
  if (!createdAt) return 0;
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return (nowMs - created) / 60_000;
}

export function isPickupOrder(row: Pick<DbOrderRow, 'fulfillment_type'> | { fulfillment_type?: string | null }) {
  return String(row.fulfillment_type || '') === 'pickup';
}

export function shouldAutoReadyPickup(
  row: Pick<DbOrderRow, 'fulfillment_type' | 'status' | 'cook_hold' | 'created_at'>,
  nowMs = Date.now()
): boolean {
  if (!isPickupOrder(row)) return false;
  if (row.status !== 'preparing') return false;
  if (row.cook_hold) return false;
  return ageMinutes(row.created_at, nowMs) >= PICKUP_AUTO_READY_MINUTES;
}

export function shouldAutoDeliverPickup(
  row: Pick<DbOrderRow, 'fulfillment_type' | 'status' | 'cook_hold' | 'created_at' | 'pickup_at'>,
  nowMs = Date.now()
): boolean {
  if (!isPickupOrder(row)) return false;
  if (row.status !== 'in_transit') return false;
  if (row.cook_hold) return false;

  const pickupAt = row.pickup_at ? new Date(row.pickup_at).getTime() : NaN;
  if (Number.isFinite(pickupAt)) {
    return nowMs >= pickupAt + 20 * 60_000;
  }

  return (
    ageMinutes(row.created_at, nowMs) >=
    PICKUP_AUTO_READY_MINUTES + PICKUP_AUTO_DELIVERED_MINUTES_AFTER_READY
  );
}

export function paidOrderStatusFields(input: {
  fulfillment: string;
  deliveryProvider?: string | null;
}): { status: 'preparing'; dispatch_status: string | null } {
  if (input.fulfillment === 'pickup') {
    return { status: 'preparing', dispatch_status: null };
  }
  if (input.deliveryProvider === 'uber') {
    return { status: 'preparing', dispatch_status: 'needs_n8n_uber' };
  }
  return { status: 'preparing', dispatch_status: 'self_iangel' };
}

/** Avanza pickup preparing→listo o listo→entregado si ya pasó el tiempo. */
export async function advancePickupOrderIfDue(
  supabase: Client,
  row: DbOrderRow,
  nowMs = Date.now()
): Promise<DbOrderRow> {
  if (shouldAutoReadyPickup(row, nowMs)) {
    const updated = await supabase
      .from('orders')
      .update({ status: 'in_transit' })
      .eq('id', row.id)
      .eq('status', 'preparing')
      .select('*')
      .maybeSingle();
    if (updated.data) return updated.data as DbOrderRow;
  }

  if (shouldAutoDeliverPickup(row, nowMs)) {
    const updated = await supabase
      .from('orders')
      .update({ status: 'delivered', dispatch_status: 'delivered', rider_status: 'idle' })
      .eq('id', row.id)
      .eq('status', 'in_transit')
      .select('*')
      .maybeSingle();
    if (updated.data) return updated.data as DbOrderRow;
  }

  return row;
}

export async function advancePickupOrdersIfDue(
  supabase: Client,
  rows: DbOrderRow[],
  nowMs = Date.now()
): Promise<DbOrderRow[]> {
  const next: DbOrderRow[] = [];
  for (const row of rows) {
    next.push(await advancePickupOrderIfDue(supabase, row, nowMs));
  }
  return next;
}
