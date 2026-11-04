import { kitchenStatusLabel } from '@/lib/order-lifecycle';
import type { OrderStatus } from '@/types';

export const KITCHEN_ACCEPTED_LABEL = 'Cocina aceptó';
export const KITCHEN_RELEASED_LABEL = 'Salida autorizada';
export const KITCHEN_PIN_LABEL = 'Clave enviada';

export type KitchenNoticeKind = 'accepted' | 'handed' | 'finished';

export type KitchenNoticeRow = {
  status?: string | null;
  fulfillment_type?: string | null;
  kitchen_accepted_at?: string | null;
  kitchen_released_at?: string | null;
  handoff_pin?: string | null;
};

const KNOWN: OrderStatus[] = [
  'awaiting_payment',
  'pending',
  'preparing',
  'in_transit',
  'delivered',
  'cancelled',
];

function knownStatus(value?: string | null): OrderStatus {
  return KNOWN.includes(value as OrderStatus) ? (value as OrderStatus) : 'preparing';
}

/** Texto del pedido en el admin. La clave se conserva mientras el pedido siga abierto. */
export function kitchenProgressLabel(row: KitchenNoticeRow): string {
  const status = knownStatus(row.status);
  const closed = status === 'delivered' || status === 'cancelled';
  let base: string;
  if (closed || status === 'in_transit' || status === 'awaiting_payment') {
    base = kitchenStatusLabel(status, row.fulfillment_type);
  } else if (row.kitchen_released_at) {
    base = KITCHEN_RELEASED_LABEL;
  } else if (row.kitchen_accepted_at) {
    base = KITCHEN_ACCEPTED_LABEL;
  } else {
    base = kitchenStatusLabel(status, row.fulfillment_type);
  }
  const pin = String(row.handoff_pin || '').trim();
  if (!closed && pin) return `${base} · ${KITCHEN_PIN_LABEL}`;
  return base;
}

/** Un aviso por acción de cocina. El rider y el cierre solo de recoger no pasan por aquí. */
export function kitchenActionNotices(input: {
  acceptNewlySaved: boolean;
  releaseNewlySaved: boolean;
  managedStep?: 'depart' | 'arrive' | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
}): KitchenNoticeKind[] {
  const notices: KitchenNoticeKind[] = [];
  const previous = String(input.previousStatus || '');
  const next = String(input.nextStatus || '');
  if (input.acceptNewlySaved) notices.push('accepted');
  if (input.releaseNewlySaved) {
    notices.push('handed');
  } else if (
    input.managedStep === 'depart' &&
    previous !== 'in_transit' &&
    previous !== 'delivered' &&
    next === 'in_transit'
  ) {
    notices.push('handed');
  } else if (input.managedStep === 'arrive' && previous !== 'delivered' && next === 'delivered') {
    notices.push('finished');
  } else if (!input.managedStep) {
    if (previous !== 'in_transit' && next === 'in_transit') notices.push('handed');
    else if (previous !== 'delivered' && next === 'delivered') notices.push('finished');
  }
  return notices;
}

export function kitchenNoticeLead(kind: KitchenNoticeKind, row: KitchenNoticeRow): string {
  if (kind === 'accepted') return 'Cocina aceptó el pedido.';
  if (kind === 'finished') return 'Cocina finalizó el pedido.';
  if (row.fulfillment_type === 'pickup' && row.status === 'in_transit') {
    return 'Cocina marcó el pedido listo para recoger.';
  }
  if (row.kitchen_released_at && row.status !== 'in_transit') return 'Cocina autorizó la salida.';
  return 'Cocina entregó el pedido.';
}

export function kitchenNoticeTitle(kind: KitchenNoticeKind): string {
  if (kind === 'accepted') return 'Cocina aceptó';
  if (kind === 'finished') return 'Cocina finalizó';
  return 'Cocina entregó';
}
