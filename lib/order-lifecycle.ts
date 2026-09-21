import type { FulfillmentMode, OrderStatus } from '@/types';

export type DispatchStatus =
  | 'self_iangel'
  | 'cook_hold'
  | 'assigned'
  | 'picked_up'
  | 'en_route'
  | 'arrived'
  | 'waiting_customer'
  | 'delivered'
  | 'delivered_unclaimed'
  | 'incident'
  | 'needs_n8n_uber'
  | 'cancelled'
  | string;

export type CustomerPhase =
  | 'payment'
  | 'received'
  | 'kitchen'
  | 'en_route'
  | 'at_door'
  | 'delivered'
  | 'incident'
  | 'cancelled';

export type OrderSyncInput = {
  status?: string | null;
  dispatchStatus?: string | null;
  fulfillment?: FulfillmentMode | string | null;
  cookHold?: boolean | null;
  leaveAtDoor?: boolean | null;
  incidentType?: string | null;
  etaMinutes?: number | null;
};

export type OrderSyncView = {
  kitchenStatus: OrderStatus;
  kitchenLabel: string;
  dispatchStatus: string;
  riderLabel: string;
  customerPhase: CustomerPhase;
  customerLabel: string;
  customerDetail: string;
  stepIndex: number;
  etaMinutes: number;
};

export const CUSTOMER_STEPS = ['Recibido', 'En cocina', 'En camino', 'En tu puerta', 'Entregado'] as const;

const KITCHEN_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Pago pendiente',
  pending: 'Recibido',
  preparing: 'Preparando',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

/** Etiqueta de cocina según fulfillment (pickup listo ≠ en camino). */
export function kitchenStatusLabel(
  status: OrderStatus,
  fulfillment?: FulfillmentMode | string | null
): string {
  if (status === 'in_transit' && fulfillment === 'pickup') return 'Listo para recoger';
  return KITCHEN_LABEL[status];
}

const RIDER_LABEL: Record<string, string> = {
  self_iangel: 'Por aceptar',
  cook_hold: 'En espera de cocina',
  assigned: 'Aceptado · recoger',
  picked_up: 'Recogido',
  en_route: 'En camino',
  arrived: 'En el domicilio',
  waiting_customer: 'Esperando al cliente',
  delivered: 'Entregado',
  delivered_unclaimed: 'Sin reclamar',
  incident: 'Incidente',
  needs_n8n_uber: 'Reasignar envío',
  uber_dispatched: 'Uber Direct',
  cancelled: 'Cancelado',
};

function asKitchenStatus(value?: string | null): OrderStatus {
  if (value === 'awaiting_payment' || value === 'pending' || value === 'preparing' || value === 'in_transit' || value === 'delivered' || value === 'cancelled') {
    return value;
  }
  if (value === 'delivered_unclaimed') return 'delivered';
  return 'pending';
}

export function viewFromOrder(input: OrderSyncInput): OrderSyncView {
  const kitchenStatus = asKitchenStatus(input.status);
  const fulfillment = input.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const dispatch = String(input.dispatchStatus || (fulfillment === 'pickup' ? 'pickup' : 'self_iangel'));
  const etaMinutes = input.etaMinutes && input.etaMinutes > 0 ? input.etaMinutes : 12;

  let customerPhase: CustomerPhase = 'received';
  let customerLabel = 'Recibido';
  let customerDetail = 'Cocina ya tiene tu pedido.';
  let stepIndex = 0;

  if (kitchenStatus === 'awaiting_payment') {
    customerPhase = 'payment';
    customerLabel = 'Pago pendiente';
    customerDetail = 'Cuando se confirme el pago, cocina verá el pedido.';
    stepIndex = 0;
  } else if (kitchenStatus === 'cancelled' || dispatch === 'cancelled') {
    customerPhase = 'cancelled';
    customerLabel = 'Cancelado';
    customerDetail = 'Este pedido fue cancelado.';
    stepIndex = 0;
  } else if (dispatch === 'incident' || dispatch === 'needs_n8n_uber') {
    customerPhase = 'incident';
    customerLabel = 'Incidente en el envío';
    customerDetail = 'Hubo un percance. No pagarás otro envío; cocina sigue el pedido.';
    stepIndex = kitchenStatus === 'in_transit' ? 2 : 1;
  } else if (dispatch === 'uber_dispatched') {
    if (kitchenStatus === 'in_transit') {
      customerPhase = 'en_route';
      customerLabel = 'En camino';
      customerDetail = 'Uber Direct lleva tu pedido.';
      stepIndex = 2;
    } else if (kitchenStatus === 'preparing') {
      customerPhase = 'kitchen';
      customerLabel = 'En cocina';
      customerDetail = 'Uber Direct recogerá cuando esté listo.';
      stepIndex = 1;
    } else {
      customerPhase = 'received';
      customerLabel = 'Recibido';
      customerDetail = 'Cocina ya tiene tu pedido. El envío va por Uber Direct.';
      stepIndex = 0;
    }
  } else if (kitchenStatus === 'delivered' || dispatch === 'delivered' || dispatch === 'delivered_unclaimed') {
    customerPhase = 'delivered';
    customerLabel = dispatch === 'delivered_unclaimed' ? 'Entregado · no reclamado' : 'Entregado';
    customerDetail = dispatch === 'delivered_unclaimed' ? 'Se cerró el viaje porque no saliste a tiempo.' : 'Tu pedido ya fue entregado.';
    stepIndex = 4;
  } else if (fulfillment === 'pickup') {
    if (kitchenStatus === 'in_transit') {
      customerPhase = 'at_door';
      customerLabel = 'Listo para recoger';
      customerDetail = 'Ya puedes pasar a sucursal.';
      stepIndex = 3;
    } else if (kitchenStatus === 'preparing') {
      customerPhase = 'kitchen';
      customerLabel = 'En cocina';
      customerDetail = 'Estamos preparando tu pedido.';
      stepIndex = 1;
    } else {
      customerPhase = 'received';
      customerLabel = 'Recibido';
      customerDetail = 'Cocina ya tiene tu pedido.';
      stepIndex = 0;
    }
  } else if (dispatch === 'waiting_customer') {
    customerPhase = 'at_door';
    customerLabel = 'El rider te espera';
    customerDetail = 'Está en tu domicilio. Tienes 10 minutos para salir.';
    stepIndex = 3;
  } else if (dispatch === 'arrived') {
    customerPhase = 'at_door';
    customerLabel = input.leaveAtDoor ? 'El rider llegó · dejará en la puerta' : 'El rider llegó';
    customerDetail = input.leaveAtDoor
      ? 'Dejará el pedido en la puerta.'
      : 'Tienes 10 minutos para salir.';
    stepIndex = 3;
  } else if (dispatch === 'picked_up' || dispatch === 'en_route' || kitchenStatus === 'in_transit') {
    customerPhase = 'en_route';
    customerLabel = 'En camino';
    customerDetail = `IANGEL va hacia ti. Llega en ~${etaMinutes} min.`;
    stepIndex = 2;
  } else if (dispatch === 'assigned' || kitchenStatus === 'preparing') {
    customerPhase = 'kitchen';
    customerLabel = input.cookHold ? 'En espera de cocina' : 'En cocina';
    customerDetail = dispatch === 'assigned'
      ? 'IANGEL ya aceptó. Cocina lo está preparando.'
      : 'Estamos preparando tu pedido.';
    stepIndex = 1;
  } else {
    customerPhase = 'received';
    customerLabel = 'Recibido';
    customerDetail = 'Cocina ya tiene tu pedido.';
    stepIndex = 0;
  }

  return {
    kitchenStatus,
    kitchenLabel: kitchenStatusLabel(kitchenStatus, fulfillment),
    dispatchStatus: dispatch,
    riderLabel: RIDER_LABEL[dispatch] || 'IANGEL',
    customerPhase,
    customerLabel,
    customerDetail,
    stepIndex,
    etaMinutes,
  };
}

export function customerStatusLabel(status: string, dispatchStatus?: string | null) {
  return viewFromOrder({ status, dispatchStatus }).customerLabel;
}

export function patchFromKitchenStatus(
  nextStatus: OrderStatus,
  current: OrderSyncInput
): Record<string, unknown> {
  const patch: Record<string, unknown> = { status: nextStatus };
  const dispatch = String(current.dispatchStatus || '');
  const pickup = current.fulfillment === 'pickup';

  if (nextStatus === 'cancelled') {
    patch.dispatch_status = 'cancelled';
    return patch;
  }
  if (nextStatus === 'delivered') {
    patch.dispatch_status = 'delivered';
    patch.rider_status = 'idle';
    return patch;
  }
  if (pickup) return patch;

  if (nextStatus === 'preparing' && (!dispatch || dispatch === 'self_iangel')) {
    patch.dispatch_status = 'self_iangel';
  }
  if (nextStatus === 'in_transit') {
    if (dispatch === 'assigned' || dispatch === 'self_iangel' || dispatch === 'cook_hold' || !dispatch) {
      patch.dispatch_status = 'en_route';
      patch.rider_status = 'en_route';
    }
  }
  return patch;
}

export function patchFromRiderAction(
  action: string,
  current: OrderSyncInput & { pickupPin?: string | null },
  pin?: string
): { patch: Record<string, unknown>; customerText: string } {
  const patch: Record<string, unknown> = {};
  let customerText = '';

  if (action === 'accept') {
    patch.dispatch_status = 'assigned';
    patch.rider_status = 'assigned';
    patch.status = 'preparing';
    customerText = 'IANGEL aceptó tu pedido. Cocina lo está preparando.';
  } else if (action === 'pickup' || action === 'en_route') {
    const expectedPin = String(current.pickupPin || '');
    if (action === 'pickup' && expectedPin && expectedPin !== String(pin || '')) {
      throw new Error('PIN de recojo incorrecto.');
    }
    patch.dispatch_status = action === 'pickup' ? 'picked_up' : 'en_route';
    patch.rider_status = patch.dispatch_status;
    patch.status = 'in_transit';
    customerText = 'Tu pedido va en camino.';
  } else if (action === 'arrive') {
    patch.dispatch_status = 'arrived';
    patch.status = 'in_transit';
    customerText = current.leaveAtDoor
      ? 'El rider llegó. Dejará el pedido en la puerta.'
      : 'El rider llegó. Tienes 10 minutos para salir.';
  } else if (action === 'start_wait') {
    patch.dispatch_status = 'waiting_customer';
    patch.status = 'in_transit';
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
    customerText = 'Hubo un incidente con el envío. Cocina sigue el pedido.';
  } else {
    throw new Error('Acción no válida');
  }

  return { patch, customerText };
}
