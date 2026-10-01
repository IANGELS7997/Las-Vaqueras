import { calcDeveloperFood } from '@/lib/pricing';

/** Reserva que nadie confirmó. El siguiente cobro con tarjeta la suelta. */
export const CASH_FEE_HOLD_MS = 20 * 60 * 1000;

export type OpenCashFee = {
  id: string;
  openCentavos: number;
};

export type CashFeeTake = {
  id: string;
  centavos: number;
};

/**
 * 15% de la carta, en centavos, sin comisión de tarjeta.
 * No puede pasar de la comida que el cliente sí pagó.
 */
export function cashDeveloperFeeCentavos(priceBase: number, foodWeb: number): number {
  const food = Math.round(Number(foodWeb) * 100) / 100;
  if (!Number.isFinite(priceBase) || priceBase <= 0 || !Number.isFinite(food) || food <= 0) return 0;
  const owed = Math.min(calcDeveloperFood(priceBase), food);
  return Math.max(0, Math.round(owed * 100));
}

/** Toma comisiones abiertas sin dejar el pago del dueño en negativo. */
export function allocateCashFees(ownerPayoutCentavos: number, fees: OpenCashFee[]) {
  let left = Math.max(0, Math.round(ownerPayoutCentavos));
  const takes: CashFeeTake[] = [];
  for (const fee of fees) {
    if (left <= 0) break;
    const open = Math.max(0, Math.round(fee.openCentavos));
    if (open <= 0) continue;
    const centavos = Math.min(open, left);
    takes.push({ id: fee.id, centavos });
    left -= centavos;
  }
  const takenCentavos = takes.reduce((sum, take) => sum + take.centavos, 0);
  return {
    takes,
    takenCentavos,
    payoutCentavos: Math.max(0, Math.round(ownerPayoutCentavos) - takenCentavos),
  };
}

/**
 * El cliente paga lo mismo. La comisión de efectivo se suma al fee de plataforma
 * y se resta de lo que Stripe transfiere al dueño.
 */
export function applyCashFeeToCard(input: {
  totalCentavos: number;
  applicationFeeCentavos: number;
  restaurantPayoutCentavos: number;
  pendingExtraCentavos: number;
  cashFeeCentavos: number;
}) {
  const allocated = allocateCashFees(input.restaurantPayoutCentavos, [
    { id: 'cash', openCentavos: input.cashFeeCentavos },
  ]);
  const pending = Math.max(0, Math.round(input.pendingExtraCentavos));
  const amountCentavos = Math.max(0, Math.round(input.totalCentavos) + pending);
  const applicationFeeCentavos = Math.max(0, Math.round(input.applicationFeeCentavos) + pending + allocated.takenCentavos);
  return {
    takenCentavos: allocated.takenCentavos,
    payoutCentavos: allocated.payoutCentavos,
    amountCentavos,
    applicationFeeCentavos,
    skipTransfer: allocated.payoutCentavos <= 0,
  };
}
