export const DELIVERY_FEE_MXN = 50;
export const INCONVENIENCE_MXN = 25;
export const WAIT_NOTICE_SECONDS = 8 * 60;
export const WAIT_CLOSE_SECONDS = 10 * 60;

export const HELP_KINDS = [
  'no_contact',
  'refused_pay',
  'cant_enter',
  'incomplete',
  'moto',
  'unsafe',
] as const;

export type HelpKind = (typeof HELP_KINDS)[number];
export type HelpPay = 'card' | 'cash';
export type HelpStep = 'notice' | 'close';

export const HELP_LABELS: Record<HelpKind, string> = {
  no_contact: 'No puedo contactar al usuario',
  refused_pay: 'No quiso pagar',
  cant_enter: 'No puedo entrar',
  incomplete: 'Pedido incorrecto o incompleto',
  moto: 'Falla de moto o choque',
  unsafe: 'Me siento inseguro',
};

const SALDO = 'Saldo pendiente de tu pedido anterior';
const PAGO = 'Pago pendiente de pedido anterior';

export type ClosePlan = {
  closesTrip: boolean;
  dispatchStatus: 'delivered_unclaimed' | 'help_return' | null;
  orderStatus: 'delivered' | null;
  customerDue: number;
  customerLabel: string | null;
  kitchenPay: number;
  lockUntil: 'payout' | 'resolve' | null;
  keepDeliveryFee: boolean;
  needsEvidence: boolean;
};

export function isHelpKind(value: string): value is HelpKind {
  return (HELP_KINDS as readonly string[]).includes(value);
}

export function foodMxnFromOrder(row: {
  pay_method?: string | null;
  cash_food_due?: number | string | null;
  restaurant_payout?: number | string | null;
  total_charged?: number | string | null;
  delivery_fee?: number | string | null;
  customer_fee?: number | string | null;
}) {
  const cash = Math.round(Number(row.cash_food_due || 0));
  if (row.pay_method === 'cash' && cash > 0) return cash;
  const payout = Math.round(Number(row.restaurant_payout || 0));
  if (payout > 0) return payout;
  const total = Number(row.total_charged || 0);
  const delivery = Number(row.delivery_fee || 0);
  const service = Number(row.customer_fee || 0);
  return Math.max(0, Math.round(total - delivery - service));
}

export function waitElapsedSeconds(waitStartedAt: string | null | undefined, now = Date.now()) {
  if (!waitStartedAt) return null;
  const started = Date.parse(waitStartedAt);
  if (!Number.isFinite(started)) return null;
  return Math.max(0, Math.floor((now - started) / 1000));
}

export function stackedPendingLabel(labels: string[]) {
  const unique = Array.from(new Set(labels.filter(Boolean)));
  if (unique.length === 1) return unique[0];
  if (unique.length === 0) return SALDO;
  return 'Saldo pendiente de pedidos anteriores';
}

/** Lo que queda decidido al cerrar el reporte. El reembolso de tarjeta lo hace Angel en Stripe. */
export function closePlan(kind: HelpKind, pay: HelpPay, food: number): ClosePlan {
  const cardLeave: ClosePlan = {
    closesTrip: true,
    dispatchStatus: 'delivered_unclaimed',
    orderStatus: 'delivered',
    customerDue: 0,
    customerLabel: null,
    kitchenPay: 0,
    lockUntil: null,
    keepDeliveryFee: true,
    needsEvidence: true,
  };
  const cashReturn = (extra25: boolean, lockUntil: 'payout' | 'resolve'): ClosePlan => ({
    closesTrip: true,
    dispatchStatus: 'help_return',
    orderStatus: null,
    customerDue: extra25 ? food + DELIVERY_FEE_MXN + INCONVENIENCE_MXN : 0,
    customerLabel: extra25 ? (kind === 'refused_pay' ? PAGO : SALDO) : null,
    kitchenPay: food + DELIVERY_FEE_MXN + (extra25 ? INCONVENIENCE_MXN : 0),
    lockUntil,
    keepDeliveryFee: false,
    needsEvidence: true,
  });

  if (kind === 'no_contact' || kind === 'cant_enter') {
    return pay === 'cash' ? cashReturn(true, 'payout') : cardLeave;
  }
  if (kind === 'refused_pay') {
    return cashReturn(true, 'payout');
  }
  if (kind === 'incomplete') {
    return {
      closesTrip: false,
      dispatchStatus: null,
      orderStatus: null,
      customerDue: 0,
      customerLabel: null,
      kitchenPay: 0,
      lockUntil: null,
      keepDeliveryFee: true,
      needsEvidence: true,
    };
  }
  if (kind === 'moto') {
    return {
      closesTrip: true,
      dispatchStatus: 'help_return',
      orderStatus: null,
      customerDue: 0,
      customerLabel: null,
      kitchenPay: 0,
      lockUntil: 'resolve',
      keepDeliveryFee: pay === 'card',
      needsEvidence: true,
    };
  }
  return pay === 'cash'
    ? { ...cashReturn(false, 'resolve'), keepDeliveryFee: false }
    : {
        closesTrip: true,
        dispatchStatus: 'help_return',
        orderStatus: null,
        customerDue: 0,
        customerLabel: null,
        kitchenPay: 0,
        lockUntil: 'resolve',
        keepDeliveryFee: true,
        needsEvidence: true,
      };
}

export function rejectedMotoDebt(pay: HelpPay, food: number) {
  if (pay === 'card') return DELIVERY_FEE_MXN;
  return Math.max(0, food - DELIVERY_FEE_MXN);
}

export function approvedMotoKitchenPay(pay: HelpPay, food: number) {
  if (pay === 'card') return 0;
  return food + DELIVERY_FEE_MXN;
}

export function helpStepError(input: {
  kind: HelpKind;
  step: HelpStep;
  pay: HelpPay;
  leaveAtDoor: boolean;
  elapsed: number | null;
  phase: string;
  evidence: boolean;
  policeReport: string;
}) {
  const active = input.phase === 'pickup' || input.phase === 'dropoff';
  if (!active) return 'Este pedido ya no está en camino';
  if (input.kind === 'no_contact' && input.leaveAtDoor) {
    return 'Este pedido se deja en la puerta. No aplica no poder contactar.';
  }
  if (input.kind === 'refused_pay' && input.pay !== 'cash') {
    return 'No quiso pagar solo aplica en efectivo';
  }
  if (input.kind === 'refused_pay' && input.phase !== 'dropoff') {
    return 'No quiso pagar se reporta al llegar con el cliente';
  }
  const timed = input.kind === 'no_contact' || input.kind === 'cant_enter';
  if (timed && input.step === 'notice' && (input.elapsed == null || input.elapsed < WAIT_NOTICE_SECONDS)) {
    return 'Ese aviso se envía cuando quedan 2 minutos de espera';
  }
  if (timed && input.step === 'close' && (input.elapsed == null || input.elapsed < WAIT_CLOSE_SECONDS)) {
    return 'La foto para irte se toma cuando el tiempo llega a 0:00';
  }
  if (input.step === 'close' && input.kind !== 'unsafe' && !input.evidence) {
    return 'Adjunta la foto o el video';
  }
  if (input.step === 'close' && input.kind === 'unsafe' && input.policeReport.trim().length < 3) {
    return 'Escribe el número de reporte que te dio el oficial';
  }
  if (input.kind === 'moto' && input.step === 'notice') return 'La falla de moto se cierra con la foto';
  if (input.kind === 'unsafe' && input.step === 'notice') return 'Para cancelar, envía el número de reporte';
  if (input.kind === 'refused_pay' && input.step === 'notice') return 'Adjunta la evidencia para cerrar el reporte';
  if (input.kind === 'incomplete' && input.step === 'notice') return 'Adjunta la evidencia del pedido';
  return null;
}

export function customerHelpCopy(kind: HelpKind, pay: HelpPay) {
  if (kind === 'no_contact' && pay === 'card') {
    return 'El repartidor esperó el tiempo completo y se retiró con el pedido. Esta compra es venta final y no genera reembolso.';
  }
  if (kind === 'no_contact' || kind === 'cant_enter') {
    return pay === 'cash'
      ? 'No hubo entrega. En tu próxima compra se cobra el saldo pendiente de este pedido.'
      : 'El repartidor no pudo completar la entrega en la puerta. El pedido sigue en revisión.';
  }
  if (kind === 'refused_pay') {
    return 'El pago de este pedido quedó pendiente. Se suma en tu próxima compra, junto con el cargo de la visita.';
  }
  if (kind === 'incomplete') {
    return 'El repartidor reportó que el pedido llegó incorrecto o incompleto. Puedes pedir la revisión desde tu perfil, con foto del ticket, foto de la comida y una descripción.';
  }
  if (kind === 'moto') {
    return 'El envío se detuvo por una falla o un choque. El caso queda en revisión.';
  }
  return 'El repartidor canceló el envío por seguridad. El caso queda en revisión.';
}

export function riderLockCopy(input: {
  kind: HelpKind;
  code: string | null;
  kitchenPay: number;
  debt: number;
  food: number;
}) {
  if (input.debt > 0) {
    return `Debes ${input.debt} pesos antes de volver a conectarte. Solo se reconocen los ${DELIVERY_FEE_MXN} del envío${
      input.food > 0 ? `; la comida fue ${input.food}, así que el saldo es ${input.debt}` : ''
    }. Las instrucciones de transferencia llegan en Chat.`;
  }
  if (input.code && input.kitchenPay > 0) {
    return `Tienes 24 horas para cobrar en la tienda. Código ${input.code}. La cajera debe escribirlo para entregarte ${input.kitchenPay} pesos.`;
  }
  if (input.kind === 'moto' || input.kind === 'unsafe') {
    return 'Tu cuenta queda restringida hasta que el caso se marque resuelto. El plazo de revisión es de 72 horas.';
  }
  return '';
}
