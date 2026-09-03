export const WEB_MARKUP = 1.05;
export const SERVICE_FEE_RATE = 0.04;
export const DELIVERY_FEE = 35;

export function calcWebPrice(priceBase: number): number {
  return Math.round(priceBase * WEB_MARKUP);
}

export function formatMXN(amount: number): string {
  return `$${amount.toFixed(2)} MXN`;
}

export function calcCartItemPrice(
  priceBase: number,
  comboUpgradePriceBase?: number
): number {
  const itemWeb = calcWebPrice(priceBase);
  const comboWeb = comboUpgradePriceBase ? calcWebPrice(comboUpgradePriceBase) : 0;
  return itemWeb + comboWeb;
}

export function calcCartSubtotal(
  items: { priceBase: number; quantity: number; comboUpgradePriceBase?: number }[]
): number {
  return items.reduce((sum, item) => {
    return sum + calcCartItemPrice(item.priceBase, item.comboUpgradePriceBase) * item.quantity;
  }, 0);
}

export function calcServiceFee(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_RATE);
}

export function calcOrderTotal(subtotal: number): {
  serviceFee: number;
  deliveryFee: number;
  total: number;
} {
  const serviceFee = calcServiceFee(subtotal);
  const total = subtotal + serviceFee + DELIVERY_FEE;
  return { serviceFee, deliveryFee: DELIVERY_FEE, total };
}
