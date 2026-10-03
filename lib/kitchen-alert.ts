import type { OrderStatus } from '@/types';

const ALERT_STATUSES = new Set<OrderStatus>(['pending', 'preparing']);

/** Sonido al pagar, con el turno activo. La impresión sigue el interruptor. */
export function kitchenAlertPlan(input: {
  shiftActive: boolean;
  autoPrint: boolean;
  alreadySeen: boolean;
  alreadyAnnounced: boolean;
  status: OrderStatus;
}): { sound: boolean; print: boolean } {
  if (!input.shiftActive || input.alreadySeen || input.alreadyAnnounced) {
    return { sound: false, print: false };
  }
  if (!ALERT_STATUSES.has(input.status)) {
    return { sound: false, print: false };
  }
  return { sound: true, print: input.autoPrint };
}
