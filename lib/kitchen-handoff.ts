export type KitchenHandoffOrder = {
  fulfillment?: string | null;
  deliveryProvider?: string | null;
  status?: string | null;
  payMethod?: string | null;
  riderPaidCash?: boolean;
  kitchenReceivedCash?: boolean;
  pickupPhotoAt?: string | null;
  kitchenReleasedAt?: string | null;
};

export const MANAGED_TRACK = [
  'Entregar pedido',
  'En camino',
  'El repartidor llegó a tu domicilio',
] as const;

/** Ventana en la que un segundo toque no puede mover otro pedido. */
export const HANDOFF_TAP_HOLD_MS = 800;

export type HandoffTapLock = {
  orderId: string;
  until: number;
};

/** Acepta el toque de un pedido. Mientras el candado sigue, el otro pedido no entra. */
export function acceptHandoffTap(
  lock: HandoffTapLock | null,
  orderId: string,
  now: number,
  holdMs = HANDOFF_TAP_HOLD_MS
): { accept: boolean; lock: HandoffTapLock | null } {
  const id = orderId.trim();
  if (!id) return { accept: false, lock };
  if (lock && now < lock.until) return { accept: false, lock };
  return { accept: true, lock: { orderId: id, until: now + holdMs } };
}

export type KitchenHandoff = {
  visible: boolean;
  enabled: boolean;
  effect: 'deliver' | 'release' | 'depart' | 'arrive';
  label: string;
  hint: string | null;
  /** Paso marcado en el recorrido de un pedido gestionado. */
  trackIndex: number | null;
};

export function isManagedDelivery(provider?: string | null) {
  return provider === 'managed';
}

export function isHouseIangel(provider?: string | null, fulfillment?: string | null) {
  if (fulfillment === 'pickup') return false;
  return provider === 'self' || provider === 'wait_self' || provider === '' || provider == null;
}

/** Botón Entregar pedido en la tarjeta de cocina. Sin pantalla de foto. */
export function kitchenHandoff(order: KitchenHandoffOrder): KitchenHandoff {
  const hidden: KitchenHandoff = {
    visible: false,
    enabled: false,
    effect: 'deliver',
    label: 'Entregar pedido',
    hint: null,
    trackIndex: null,
  };
  if (order.status === 'delivered' || order.status === 'cancelled') return hidden;

  if (isManagedDelivery(order.deliveryProvider)) {
    const onTheWay = order.status === 'in_transit';
    return {
      visible: true,
      enabled: true,
      effect: onTheWay ? 'arrive' : 'depart',
      label: onTheWay ? 'Llegó el pedido al domicilio' : 'Entregar pedido',
      hint: null,
      trackIndex: onTheWay ? 1 : 0,
    };
  }

  if (order.fulfillment === 'pickup') {
    return { visible: true, enabled: true, effect: 'deliver', label: 'Entregar pedido', hint: null, trackIndex: null };
  }

  if (!isHouseIangel(order.deliveryProvider, order.fulfillment)) return hidden;

  if (order.kitchenReleasedAt) {
    return {
      visible: true,
      enabled: false,
      effect: 'release',
      label: 'Entregar pedido',
      hint: 'Salida autorizada. El rider ya puede salir.',
      trackIndex: null,
    };
  }
  if (!order.pickupPhotoAt) {
    return {
      visible: true,
      enabled: false,
      effect: 'release',
      label: 'Entregar pedido',
      hint: 'Se habilita cuando el rider tome la foto del pedido.',
      trackIndex: null,
    };
  }
  if (order.payMethod === 'cash' && !(order.riderPaidCash && order.kitchenReceivedCash)) {
    return {
      visible: true,
      enabled: false,
      effect: 'release',
      label: 'Entregar pedido',
      hint: 'Falta confirmar el efectivo.',
      trackIndex: null,
    };
  }
  return { visible: true, enabled: true, effect: 'release', label: 'Entregar pedido', hint: null, trackIndex: null };
}
