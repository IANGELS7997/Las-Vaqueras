export {
  giftCreditBase as giftFoodCreditFromItems,
  giftJumboLineUid,
  lineWebAfterGift,
  resolveGiftCart,
} from '@/lib/gift-cart';

export const GIFT_REDEEM_KEY = 'lv_gift_redeem';

export const GIFT_COUPON_TITLE = 'Cupón';

export const GIFT_FULFILLMENT_COPY =
  'Este cupón cubre una orden de Papas Jumbo. Puedes agregar más artículos: esos se pagan a precio de carta. Recoger solo el Jumbo no tiene cargo. A domicilio se cotiza el envío y se suma a lo que sí se cobra. No admite cancelación ni devolución.';

export const GIFT_EMAIL_ARRIVAL = 'El pedido ya está en cocina y te llegará pronto.';
export const GIFT_EMAIL_FINAL = 'No admite cancelación ni devolución.';

export function writeGiftRedeem(kind: 'jumbo') {
  try {
    sessionStorage.setItem(GIFT_REDEEM_KEY, kind);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readGiftRedeem() {
  try {
    return sessionStorage.getItem(GIFT_REDEEM_KEY);
  } catch {
    return null;
  }
}

export function clearGiftRedeem() {
  try {
    sessionStorage.removeItem(GIFT_REDEEM_KEY);
  } catch {
    // sessionStorage may be unavailable
  }
}
