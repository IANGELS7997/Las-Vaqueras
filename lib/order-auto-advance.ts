import type { createAdminSupabase } from '@/lib/supabase-admin';
import type { DbOrderRow } from '@/lib/orders-map';

type Client = ReturnType<typeof createAdminSupabase>;

/** Pedido viejo sin hora, ya listo: se cierra este rato después de creado. */
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

  return ageMinutes(row.created_at, nowMs) >= PICKUP_AUTO_DELIVERED_MINUTES_AFTER_READY;
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
  if (input.deliveryProvider === 'managed') {
    return { status: 'preparing', dispatch_status: 'managed' };
  }
  return { status: 'preparing', dispatch_status: 'self_iangel' };
}

/** Cierra un recoger ya listo cuando pasó la hora. Cocina marca el listo. */
export async function advancePickupOrderIfDue(
  supabase: Client,
  row: DbOrderRow,
  nowMs = Date.now()
): Promise<DbOrderRow> {
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
