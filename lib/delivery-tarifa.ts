import { getMenuItemById } from '@/lib/mock-data';

export const DOMICILE_TARIFA_PER_PLATILLO = 9;
export const DOMICILE_TARIFA_CAP = 36;
export const DELIVERY_FEE_FLOOR = 45;
export const SUBSIDY_MIN_WEB = 180;
export const SUBSIDY_MID_UBER = 25;
export const SUBSIDY_HIGH_UBER = 30;

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isDeliveryPlatillo(menuItemId: string): boolean {
  const item = getMenuItemById(menuItemId);
  if (!item) return true;
  return item.category !== 'bebidas';
}

export function countDeliveryPlatillos(
  items: { menuItemId?: string; quantity?: number }[]
): number {
  return items.reduce((sum, item) => {
    if (!item.menuItemId || !isDeliveryPlatillo(item.menuItemId)) return sum;
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    return sum + Math.floor(qty);
  }, 0);
}

export function calcDomicileTarifa(platilloCount: number): number {
  if (platilloCount <= 0) return 0;
  return Math.min(DOMICILE_TARIFA_CAP, platilloCount * DOMICILE_TARIFA_PER_PLATILLO);
}

/** Subsidy from platform margin. Uses raw Uber fee, not the already-discounted amount. */
export function calcPlatformDeliverySubsidy(uberFee: number, subtotalWeb: number): number {
  if (subtotalWeb < SUBSIDY_MIN_WEB) return 0;
  if (uberFee < 50) return 0;
  if (uberFee <= 80) return SUBSIDY_MID_UBER;
  return SUBSIDY_HIGH_UBER;
}

export function calcCustomerDeliveryFee(input: {
  uberFee: number;
  domicileTarifa: number;
  subsidy: number;
}): { deliveryFee: number; deliveryDiscount: number } {
  const uberFee = money(Math.max(0, input.uberFee));
  const unfloored = money(uberFee - input.domicileTarifa - input.subsidy);
  const deliveryFee = money(Math.min(uberFee, Math.max(DELIVERY_FEE_FLOOR, unfloored)));
  return {
    deliveryFee,
    deliveryDiscount: money(uberFee - deliveryFee),
  };
}
