/** 5% processing absorption + 8% platform fee over physical menu base */
export const WEB_MARKUP = 1.13;
export const SERVICE_FEE_RATE = 0.04;
export const RESTAURANT_PAYOUT_RATE = 0.92;
export const DELIVERY_FEE = 35;

/** price_web = Math.round(price_base * 1.13) */
export function calcWebPrice(priceBase: number): number {
  return Math.round(priceBase * WEB_MARKUP);
}

/** C_cliente = Math.round(M_web * 0.04 * 100) / 100 */
export function calcCustomerFee(mWeb: number): number {
  return Math.round(mWeb * SERVICE_FEE_RATE * 100) / 100;
}

/** D_restaurante = Math.round(M_base * 0.92 * 100) / 100 */
export function calcRestaurantPayout(mBase: number): number {
  return Math.round(mBase * RESTAURANT_PAYOUT_RATE * 100) / 100;
}

export function formatMXN(amount: number): string {
  return `$${amount.toFixed(2)} MXN`;
}

export function extrasBaseTotal(extras?: { price_base: number }[]): number {
  return extras?.reduce((sum, extra) => sum + extra.price_base, 0) ?? 0;
}

export function extrasWebTotal(extras?: { price_base: number }[]): number {
  return extras?.reduce((sum, extra) => sum + calcWebPrice(extra.price_base), 0) ?? 0;
}

export function calcCartItemPrice(
  priceBase: number,
  comboUpgradePriceBase?: number,
  extras?: { price_base: number }[]
): number {
  const itemWeb = calcWebPrice(priceBase);
  const comboWeb = comboUpgradePriceBase ? calcWebPrice(comboUpgradePriceBase) : 0;
  return itemWeb + comboWeb + extrasWebTotal(extras);
}

export function calcCartLineWeb(item: {
  price_base: number;
  quantity: number;
  comboUpgrade?: { price_base: number };
  extras?: { price_base: number }[];
}): number {
  return calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base, item.extras) * item.quantity;
}

export function calcCartBaseTotal(
  items: {
    price_base: number;
    quantity: number;
    comboUpgrade?: { price_base: number };
    extras?: { price_base: number }[];
  }[]
): number {
  return items.reduce((sum, item) => {
    const combo = item.comboUpgrade?.price_base ?? 0;
    const extras = extrasBaseTotal(item.extras);
    return sum + (item.price_base + combo + extras) * item.quantity;
  }, 0);
}

export function calcCartSubtotal(
  items: { priceBase: number; quantity: number; comboUpgradePriceBase?: number; extras?: { price_base: number }[] }[]
): number {
  return items.reduce((sum, item) => {
    return sum + calcCartItemPrice(item.priceBase, item.comboUpgradePriceBase, item.extras) * item.quantity;
  }, 0);
}

export function calcServiceFee(subtotalWeb: number): number {
  return calcCustomerFee(subtotalWeb);
}

export function calcOrderTotal(subtotalWeb: number): {
  serviceFee: number;
  deliveryFee: number;
  total: number;
} {
  const serviceFee = calcCustomerFee(subtotalWeb);
  const total = subtotalWeb + serviceFee + DELIVERY_FEE;
  return { serviceFee, deliveryFee: DELIVERY_FEE, total };
}
