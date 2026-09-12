import type { CartItem } from '@/types';
import type { FulfillmentMode } from '@/lib/fulfillment';
import { JUMBO_PRODUCT_ID } from '@/lib/loyalty';
import { calcCartBaseTotal, calcCartLineWeb } from '@/lib/pricing';

/**
 * Espacio de estados del cupón Jumbo (una sola unidad de crédito):
 *
 *   flagged × jumboUnits × chargedBase × fulfillment
 *
 *   none            — sin cupón activo
 *   free_pickup     — 1 Jumbo, sin extra, recoger → $0
 *   shipping_only   — 1 Jumbo, sin extra, domicilio → solo envío
 *   mixed_pickup    — cupón + comida extra, recoger → paga el extra
 *   mixed_delivery  — cupón + extra y/o Jumbo extra, domicilio → extra + envío
 *
 * El crédito es exactamente 1 × price_base del primer Jumbo.
 * Combos, extras y unidades adicionales se cobran.
 */
export type GiftVariant =
  | 'none'
  | 'free_pickup'
  | 'shipping_only'
  | 'mixed_pickup'
  | 'mixed_delivery';

export type GiftCartState = {
  flagged: boolean;
  active: boolean;
  variant: GiftVariant;
  giftLineUid: string;
  giftUnits: number;
  creditBase: number;
  chargedBase: number;
  cartaBase: number;
};

function money(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100;
}

export function giftCreditBase(items: CartItem[]) {
  const line = items.find((item) => item.menuItemId === JUMBO_PRODUCT_ID);
  if (!line) return 0;
  return money(line.price_base);
}

export function giftJumboLineUid(items: { uid: string; menuItemId: string }[]) {
  return items.find((item) => item.menuItemId === JUMBO_PRODUCT_ID)?.uid || '';
}

export function giftUnitsInCart(items: { menuItemId: string; quantity: number }[]) {
  return items.reduce((sum, item) => {
    if (item.menuItemId !== JUMBO_PRODUCT_ID) return sum;
    const qty = Number(item.quantity);
    return sum + (Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0);
  }, 0);
}

export function lineWebAfterGift(
  item: {
    uid: string;
    menuItemId: string;
    price_base: number;
    quantity: number;
    comboUpgrade?: { price_base: number };
    extras?: { price_base: number }[];
  },
  giftUid: string
) {
  if (!giftUid || item.uid !== giftUid) return calcCartLineWeb(item);
  if (item.quantity <= 1) return 0;
  return calcCartLineWeb({ ...item, quantity: item.quantity - 1 });
}

export function resolveGiftCart(input: {
  flagged: boolean;
  items: CartItem[];
  fulfillment: FulfillmentMode | null;
}): GiftCartState {
  const cartaBase = money(calcCartBaseTotal(input.items));
  const giftLineUid = giftJumboLineUid(input.items);
  const giftUnits = giftUnitsInCart(input.items);
  const creditBase = input.flagged && giftUnits > 0 ? giftCreditBase(input.items) : 0;
  const chargedBase = money(cartaBase - creditBase);
  const active = Boolean(input.flagged && giftUnits > 0);
  const pickup = input.fulfillment === 'pickup';
  const delivery = input.fulfillment === 'delivery';

  let variant: GiftVariant = 'none';
  if (active && pickup && chargedBase === 0) variant = 'free_pickup';
  else if (active && delivery && chargedBase === 0) variant = 'shipping_only';
  else if (active && pickup) variant = 'mixed_pickup';
  else if (active && delivery) variant = 'mixed_delivery';

  return {
    flagged: input.flagged,
    active,
    variant,
    giftLineUid,
    giftUnits,
    creditBase,
    chargedBase,
    cartaBase,
  };
}

export function isZeroChargeGift(variant: GiftVariant) {
  return variant === 'free_pickup';
}

export function isShippingOnlyGift(variant: GiftVariant) {
  return variant === 'shipping_only';
}

export function usesStripeForGift(variant: GiftVariant) {
  return variant === 'shipping_only' || variant === 'mixed_pickup' || variant === 'mixed_delivery';
}
