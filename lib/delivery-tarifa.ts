import { calcDeliveryDiscountFromCarta } from '@/lib/pricing';
import { getMenuItemById } from '@/lib/mock-data';

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

/** Customer pays Uber quote minus 3% of carta. Never below $0. */
export function calcCustomerDeliveryFee(input: {
  uberFee: number;
  priceBaseTotal: number;
}): { deliveryFee: number; deliveryDiscount: number } {
  const uberFee = money(Math.max(0, input.uberFee));
  const discount = calcDeliveryDiscountFromCarta(input.priceBaseTotal);
  const deliveryFee = money(Math.max(0, uberFee - discount));
  return {
    deliveryFee,
    deliveryDiscount: money(uberFee - deliveryFee),
  };
}
