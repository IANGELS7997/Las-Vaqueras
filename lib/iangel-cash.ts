import { SELF_FEE_MXN } from '@/lib/iangel-constants';
import { STRIPE_CONNECT_OWNER_LIVE } from '@/lib/stripe-connect-destination';

export const CASH_FOOD_CAP_MXN = 500;
export const ANGEL_RIDER_KEY = 'angel';
/** Teléfono de Adrián. La clave del rider es ese número. */
export const ADRIAN_RIDER_DIGITS = '6141921662';
/**
 * Express que ya existe. Solo el envío de Adrián sale hacia aquí.
 * No usar esta cuenta para el fee de otro rider.
 */
export const ADRIAN_DELIVERY_FEE_ACCOUNT = STRIPE_CONNECT_OWNER_LIVE;
export const RIDER_FEE_CENTAVOS = SELF_FEE_MXN * 100;

const PICKED_UP = new Set(['picked_up', 'en_route', 'arrived', 'waiting_customer', 'delivered']);

export type CashOrderView = {
  payMethod: string | null;
  cashFoodDue: number | null;
  riderPaidCash: boolean;
  kitchenReceivedCash: boolean;
  doorCollected?: boolean;
  leaveAtDoor?: boolean;
  dispatchStatus: string | null;
  riderKey: string | null;
  fulfillment?: string | null;
  deliveryProvider?: string | null;
  id?: string;
};

export type FeeNotice = {
  payMethod: 'card' | 'cash';
  feeStatus: 'retained_platform' | 'transferred' | 'pending_verification' | 'settled_cash';
  feeDestination: 'platform' | 'rider_bank' | 'rider_connect' | 'cash_door';
  feeMxn: number;
  feeReviewed?: boolean;
};

export type TransferOrder =
  | { kind: 'none' }
  | {
      kind: 'transfer';
      amountCentavos: number;
      idempotencyKey: string;
      destination: string;
      metadata: { purpose: 'iangel_delivery_fee'; orderId: string };
    };

export function riderDigits(key: string | null | undefined) {
  return String(key || '').replace(/\D/g, '');
}

export function isAngelRider(key: string | null | undefined) {
  return String(key || '').trim() === ANGEL_RIDER_KEY;
}

export function isAdrianRider(key: string | null | undefined) {
  const digits = riderDigits(key);
  return digits === ADRIAN_RIDER_DIGITS || digits === `52${ADRIAN_RIDER_DIGITS}`;
}

export function isIangelCashProvider(provider: string | null | undefined, fulfillment?: string | null) {
  if (String(fulfillment || '') === 'pickup') return false;
  const kind = String(provider || '');
  return kind === 'self' || kind === 'wait_self';
}

export function cashCheckoutAllowed(input: {
  provider?: string | null;
  fulfillment?: string | null;
  subtotalWeb: number;
}): { ok: true } | { ok: false; error: string } {
  const pickup = String(input.fulfillment || '') === 'pickup';
  if (!pickup && !isIangelCashProvider(input.provider, input.fulfillment)) {
    return { ok: false, error: 'El efectivo no está disponible en este envío' };
  }
  const food = Number(input.subtotalWeb);
  if (!Number.isFinite(food) || food <= 0) {
    return { ok: false, error: 'El carrito no tiene un subtotal válido' };
  }
  if (!pickup && food > CASH_FOOD_CAP_MXN) {
    return { ok: false, error: 'El efectivo no está disponible si la comida pasa de $500' };
  }
  return { ok: true };
}

/** Comida que se deja en la tienda. Los $50 no entran aquí. */
export function cashStoredAmounts(subtotalWeb: number, fulfillment?: string | null, routedFee?: number | null) {
  const cashFoodDue = Math.round(Number(subtotalWeb) * 100) / 100;
  const pickup = String(fulfillment || '') === 'pickup';
  const deliveryFee = pickup
    ? 0
    : typeof routedFee === 'number' && Number.isFinite(routedFee) && routedFee > 0
      ? Math.round(routedFee)
      : SELF_FEE_MXN;
  const doorDue = Number((cashFoodDue + deliveryFee).toFixed(2));
  return {
    cashFoodDue,
    doorDue,
    deliveryFee,
    restaurantPayout: cashFoodDue,
    platformFee: 0,
    totalCharged: doorDue,
  };
}

export function cashViewFromRow(row: Record<string, unknown>): CashOrderView {
  const due = row.cash_food_due;
  return {
    id: row.id == null ? undefined : String(row.id),
    payMethod: row.pay_method == null ? null : String(row.pay_method),
    cashFoodDue: due == null || due === '' ? null : Number(due),
    riderPaidCash: row.rider_paid_cash === true,
    kitchenReceivedCash: row.kitchen_received_cash === true,
    doorCollected: row.cash_door_collected_at != null && String(row.cash_door_collected_at) !== '',
    leaveAtDoor: row.leave_at_door === true,
    dispatchStatus: (row.dispatch_status as string | null) || null,
    riderKey: row.iangel_rider_key == null ? null : String(row.iangel_rider_key),
    fulfillment: row.fulfillment_type == null ? null : String(row.fulfillment_type),
    deliveryProvider: row.delivery_provider == null ? null : String(row.delivery_provider),
  };
}

export function paidCashPatch(order: CashOrderView, actorKey: string): { rider_paid_cash: true } {
  if (order.payMethod !== 'cash') {
    throw new Error('Este pedido no es en efectivo');
  }
  const due = Number(order.cashFoodDue);
  if (!Number.isFinite(due) || due <= 0) {
    throw new Error('Este pedido no tiene el monto de la comida');
  }
  if (PICKED_UP.has(String(order.dispatchStatus || ''))) {
    throw new Error('Este pedido ya se recogió');
  }
  const owner = String(order.riderKey || '').trim();
  const actor = String(actorKey || '').trim();
  if (owner && owner !== actor) {
    throw new Error('Este pedido lo lleva el otro rider');
  }
  if (order.riderPaidCash) {
    throw new Error('La comida en efectivo ya quedó marcada');
  }
  return { rider_paid_cash: true };
}

export function doorCollectAmounts(food: number) {
  const comida = Math.round(Number(food));
  const puerta = comida + SELF_FEE_MXN;
  return {
    comida,
    puerta,
    note: `Puerta $${puerta} · comida $${comida} + envío $${SELF_FEE_MXN}`,
  };
}

/** Marca el efectivo cobrado en la puerta. No cierra el viaje. */
export function collectDoorPatch(order: CashOrderView): { cash_door_collected_at: string } {
  if (order.payMethod !== 'cash') {
    throw new Error('Este pedido no es en efectivo');
  }
  const due = Number(order.cashFoodDue);
  if (!Number.isFinite(due) || due <= 0) {
    throw new Error('Este pedido no tiene el monto de la comida');
  }
  const status = String(order.dispatchStatus || '');
  const atDoor = status === 'waiting_customer' || (status === 'arrived' && order.leaveAtDoor === true);
  if (!atDoor) {
    throw new Error('El cobro en puerta es al entregar');
  }
  if (order.doorCollected) {
    throw new Error('Este pedido ya quedó cobrado');
  }
  return { cash_door_collected_at: new Date().toISOString() };
}

export function assertCashPickup(order: CashOrderView) {
  if (order.payMethod !== 'cash') return;
  const due = Number(order.cashFoodDue);
  if (!Number.isFinite(due) || due <= 0) {
    throw new Error('Falta el monto de la comida en efectivo');
  }
  if (!order.riderPaidCash || !order.kitchenReceivedCash) {
    throw new Error('Cocina no suelta el pedido hasta que el rider y la cocina marquen el efectivo');
  }
}

export function kitchenCashPatch(
  order: CashOrderView,
  next: { riderPaidCash?: boolean; kitchenReceivedCash?: boolean }
): { rider_paid_cash?: boolean; kitchen_received_cash?: boolean } {
  if (order.payMethod !== 'cash') {
    throw new Error('Este pedido no es en efectivo');
  }
  const assigned = String(order.dispatchStatus || '') === 'assigned';
  const patch: { rider_paid_cash?: boolean; kitchen_received_cash?: boolean } = {};
  const apply = (
    column: 'rider_paid_cash' | 'kitchen_received_cash',
    current: boolean,
    value: boolean | undefined
  ) => {
    if (typeof value !== 'boolean' || value === current) return;
    if (!assigned) {
      throw new Error('Las marcas solo se corrigen mientras el pedido está asignado');
    }
    patch[column] = value;
  };
  apply('rider_paid_cash', order.riderPaidCash, next.riderPaidCash);
  apply('kitchen_received_cash', order.kitchenReceivedCash, next.kitchenReceivedCash);
  if (Object.keys(patch).length === 0) {
    throw new Error('Sin cambios en el efectivo');
  }
  return patch;
}

export function deliveryFeeSettlement(input: {
  id: string;
  payMethod: string | null;
  riderKey: string | null;
  deliveryProvider: string | null;
  fulfillment: string | null;
  status: 'delivered' | 'cancelled';
}): { notice: FeeNotice | null; transfer: TransferOrder } {
  const none = { notice: null, transfer: { kind: 'none' as const } };
  if (input.status !== 'delivered') return none;
  if (!isIangelCashProvider(input.deliveryProvider, input.fulfillment)) return none;

  const method = input.payMethod === 'cash' ? 'cash' : 'card';
  if (method === 'cash') {
    return {
      notice: {
        payMethod: 'cash',
        feeStatus: 'settled_cash',
        feeDestination: 'cash_door',
        feeMxn: SELF_FEE_MXN,
        feeReviewed: isAngelRider(input.riderKey),
      },
      transfer: { kind: 'none' },
    };
  }
  if (isAngelRider(input.riderKey)) {
    return {
      notice: {
        payMethod: 'card',
        feeStatus: 'retained_platform',
        feeDestination: 'platform',
        feeMxn: SELF_FEE_MXN,
        feeReviewed: true,
      },
      transfer: { kind: 'none' },
    };
  }
  if (isAdrianRider(input.riderKey)) {
    return {
      notice: {
        payMethod: 'card',
        feeStatus: 'transferred',
        feeDestination: 'rider_bank',
        feeMxn: SELF_FEE_MXN,
        feeReviewed: true,
      },
      transfer: {
        kind: 'transfer',
        amountCentavos: RIDER_FEE_CENTAVOS,
        idempotencyKey: `order:${input.id}:rider_fee`,
        destination: ADRIAN_DELIVERY_FEE_ACCOUNT,
        metadata: { purpose: 'iangel_delivery_fee', orderId: input.id },
      },
    };
  }
  return {
    notice: {
      payMethod: 'card',
      feeStatus: 'pending_verification',
      feeDestination: 'rider_connect',
      feeMxn: SELF_FEE_MXN,
    },
    transfer: { kind: 'none' },
  };
}
