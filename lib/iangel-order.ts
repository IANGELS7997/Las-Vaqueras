import { isTestOrderRow } from '@/lib/iangel-auth';

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
    estimatedMinutes: 12,
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
  const test = isTestOrderRow(order);
  const patch: Record<string, unknown> = {};
  let customerText = '';

  if (action === 'accept') {
    patch.dispatch_status = 'assigned';
    patch.rider_status = 'assigned';
    patch.status = 'preparing';
    customerText = 'IANGEL aceptó tu pedido. Cocina lo está preparando.';
  } else if (action === 'pickup' || action === 'en_route') {
    const expectedPin = String(order.pickup_pin || '');
    if (action === 'pickup' && expectedPin && !test && expectedPin !== String(pin || '')) {
      throw new Error('PIN de recojo incorrecto.');
    }
    patch.dispatch_status = action === 'pickup' ? 'picked_up' : 'en_route';
    patch.rider_status = patch.dispatch_status;
    patch.status = 'in_transit';
    customerText = 'Tu pedido va en camino.';
  } else if (action === 'arrive') {
    patch.dispatch_status = 'arrived';
    customerText = order.leave_at_door
      ? 'El rider llegó. Dejará el pedido en la puerta.'
      : 'El rider llegó. Tienes 10 minutos para salir.';
  } else if (action === 'start_wait') {
    patch.dispatch_status = 'waiting_customer';
    patch.wait_started_at = new Date().toISOString();
    customerText = 'Estoy aquí. Te espero 10 minutos.';
  } else if (action === 'deliver') {
    patch.dispatch_status = 'delivered';
    patch.status = 'delivered';
    patch.rider_status = 'idle';
    customerText = 'Pedido entregado.';
  } else if (action === 'incident') {
    patch.incident_type = 'moto';
    patch.dispatch_status = 'incident';
    customerText = 'Hubo un incidente con el envío. Seguimos el pedido desde cocina.';
  } else {
    throw new Error('Acción no válida');
  }

  return { patch, customerText };
}
