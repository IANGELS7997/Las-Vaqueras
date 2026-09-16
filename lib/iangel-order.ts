import { isTestOrderRow } from '@/lib/iangel-auth';
import { patchFromRiderAction } from '@/lib/order-lifecycle';

export type IangelOrder = {
  id: string;
  shortCode: string | null;
  pickupPin: string | null;
  status: string;
  dispatchStatus: string | null;
  cookHold: boolean;
  leaveAtDoor: boolean;
  dropoffLat: number | null;
  dropoffLng: number | null;
  etaMinutes: number | null;
  estimatedMinutes: number;
  customer: { name: string; phone: string; address: string; phoneAlt?: string };
  total: number;
};

export function mapIangelOrder(row: Record<string, unknown>): IangelOrder {
  return {
    id: String(row.id),
    shortCode: (row.short_code as string | null) || null,
    pickupPin: (row.pickup_pin as string | null) || null,
    status: String(row.status || 'pending'),
    dispatchStatus: (row.dispatch_status as string | null) || null,
    cookHold: Boolean(row.cook_hold),
    leaveAtDoor: Boolean(row.leave_at_door),
    dropoffLat: row.dropoff_lat == null ? null : Number(row.dropoff_lat),
    dropoffLng: row.dropoff_lng == null ? null : Number(row.dropoff_lng),
    etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
    estimatedMinutes: row.eta_minutes == null ? 12 : Number(row.eta_minutes),
    customer: {
      name: String(row.customer_name || ''),
      phone: String(row.customer_phone || ''),
      address: String(row.delivery_address || ''),
      phoneAlt: (row.customer_phone_alt as string | undefined) || undefined,
    },
    total: Number(row.total_charged || 0),
  };
}

const ACTIVE_TRIP = new Set(['assigned', 'picked_up', 'en_route', 'arrived', 'waiting_customer']);

export function isActiveTrip(dispatchStatus: string | null) {
  return Boolean(dispatchStatus && ACTIVE_TRIP.has(dispatchStatus));
}

export async function runIangelOrderAction(order: Record<string, unknown>, action: string, pin?: string) {
  return patchFromRiderAction(
    action,
    {
      status: String(order.status || ''),
      dispatchStatus: (order.dispatch_status as string | null) || null,
      fulfillment: (order.fulfillment_type as string | null) || 'delivery',
      cookHold: Boolean(order.cook_hold),
      leaveAtDoor: Boolean(order.leave_at_door),
      pickupPin: (order.pickup_pin as string | null) || null,
      etaMinutes: order.eta_minutes == null ? null : Number(order.eta_minutes),
    },
    pin,
    isTestOrderRow(order)
  );
}
