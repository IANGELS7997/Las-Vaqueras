/**
 * Carta económica = `price_base` (P).
 * Cliente paga P′ = redondeo al peso de P × WEB_MARKUP.
 * Recoger e IANGEL: desarrollador = 15% de P. Dueño = P′ − ese 15%.
 * Stripe de ese cobro se reparte según esa comida. El envío de $50 no entra.
 * Uber Direct conserva dueño = 0.90 × P − Stripe/2.
 */
export const WEB_MARKUP = 1.1;
export const SERVICE_FEE_RATE = 0;
/** Uber Direct only: share of carta base P (not of the customer web price). */
export const RESTAURANT_PAYOUT_RATE = 0.9;
/** Recoger e IANGEL: share of carta base P for the developer. */
export const DEVELOPER_FOOD_RATE = 0.15;
export const PLATFORM_SHARE_OF_BASE = DEVELOPER_FOOD_RATE;
/** 3% of Uber Direct quote, taken from the platform share. Never applied to IANGEL $50. */
export const UBER_QUOTE_DISCOUNT_RATE = 0.03;
export const DELIVERY_FEE = 35;

/** Precio que ve y paga el cliente: 10% sobre la carta, al peso más cercano. */
export function calcWebPrice(priceBase: number): number {
  if (!Number.isFinite(priceBase) || priceBase <= 0) return 0;
  const baseCents = Math.round(priceBase * 100);
  const markupHundredths = Math.round(WEB_MARKUP * 100);
  const webCents = Math.round((baseCents * markupHundredths) / 100);
  return Math.round(webCents / 100);
}

export function calcCustomerFee(mWeb: number): number {
  return Math.round(mWeb * SERVICE_FEE_RATE * 100) / 100;
}

/** Uber Direct: dueño gross = 90% of carta base P, rounded to cents (before Stripe/2). */
export function calcRestaurantPayout(mBase: number): number {
  return Math.round(mBase * RESTAURANT_PAYOUT_RATE * 100) / 100;
}

/** Recoger e IANGEL: 15% of the full carta base, rounded to cents. */
export function calcDeveloperFood(priceBase: number): number {
  if (!Number.isFinite(priceBase) || priceBase <= 0) return 0;
  return Math.round(priceBase * DEVELOPER_FOOD_RATE * 100) / 100;
}

/**
 * Stripe split for recoger e IANGEL. Weights are the food each party receives.
 * The rounding cent stays with the owner. The developer never pays more than his food.
 */
export function allocateFoodStripe(stripeFee: number, developerGross: number, ownerGross: number) {
  const fee = Math.max(0, Math.round(stripeFee * 100) / 100);
  const developer = Math.max(0, Math.round(developerGross * 100) / 100);
  const owner = Math.max(0, Math.round(ownerGross * 100) / 100);
  const pool = developer + owner;
  if (fee === 0 || pool <= 0) return { developerStripe: 0, ownerStripe: fee };
  let developerStripe = Number(((fee * developer) / pool).toFixed(2));
  if (developerStripe > developer) developerStripe = developer;
  const ownerStripe = Number((fee - developerStripe).toFixed(2));
  return { developerStripe, ownerStripe };
}

export function calcUberQuoteDiscount(uberQuote: number): number {
  return Math.round(Math.max(0, uberQuote) * UBER_QUOTE_DISCOUNT_RATE * 100) / 100;
}

/** Mexico cards: 3.6% + $3 MXN, plus 16% IVA. */
export const STRIPE_PERCENT = 0.036;
export const STRIPE_FIXED_MXN = 3;
export const STRIPE_IVA = 1.16;

export function calcStripeFee(totalCharged: number): number {
  const net = STRIPE_PERCENT * Math.max(0, totalCharged) + STRIPE_FIXED_MXN;
  return Math.round(net * STRIPE_IVA * 100) / 100;
}

export function calcStripeShare(totalCharged: number): number {
  return Math.round((calcStripeFee(totalCharged) / 2) * 100) / 100;
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
