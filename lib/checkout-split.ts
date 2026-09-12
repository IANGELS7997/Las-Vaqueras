import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
import {
  calcCustomerFee,
  calcRestaurantPayout,
  calcStripeFee,
  calcStripeShare,
  calcWebPrice,
  DELIVERY_FEE,
} from '@/lib/pricing';
import type { FulfillmentMode } from '@/types';

export type CheckoutSplitInput = {
  priceBaseTotal: number;
  fulfillment?: FulfillmentMode;
  platilloCount?: number;
  /** Raw Uber Direct quote. Legacy alias: deliveryFee. */
  uberFee?: number;
  deliveryFee?: number;
  /** Gift redeem: descuenta esta carta de la comida; el 3% de envío usa la carta completa. */
  giftFoodCredit?: number;
  /** @deprecated usa giftFoodCredit */
  waiveFood?: boolean;
};

export type CheckoutSplit = {
  subtotalWeb: number;
  customerFee: number;
  domicileTarifa: number;
  uberFee: number;
  deliverySubsidy: number;
  deliveryDiscount: number;
  totalCharged: number;
  restaurantPayout: number;
  stripeFee: number;
  stripeShare: number;
  platformFee: number;
  totalChargedCentavos: number;
  restaurantPayoutCentavos: number;
  applicationFeeCentavos: number;
  deliveryFee: number;
};

export function calcCheckoutSplit({
  priceBaseTotal,
  fulfillment = 'delivery',
  uberFee,
  deliveryFee: legacyDeliveryFee,
  giftFoodCredit = 0,
  waiveFood = false,
}: CheckoutSplitInput): CheckoutSplit {
  const credit = waiveFood
    ? priceBaseTotal
    : Math.min(Math.max(0, priceBaseTotal), Math.max(0, giftFoodCredit));
  const chargedBase = Math.round((priceBaseTotal - credit) * 100) / 100;
  const subtotalWeb = calcWebPrice(chargedBase);
  const customerFee = calcCustomerFee(subtotalWeb);
  const restaurantGross = calcRestaurantPayout(chargedBase);
  const rawUber = uberFee ?? legacyDeliveryFee ?? DELIVERY_FEE;

  const delivery =
    fulfillment === 'pickup'
      ? { deliveryFee: 0, deliveryDiscount: 0, uberFee: 0 }
      : {
          ...calcCustomerDeliveryFee({
            uberFee: rawUber,
            priceBaseTotal,
          }),
          uberFee: rawUber,
        };

  const totalCharged = Number((subtotalWeb + customerFee + delivery.deliveryFee).toFixed(2));
  const stripeFee = calcStripeFee(totalCharged);
  const stripeShare = calcStripeShare(totalCharged);
  const restaurantPayout = Number(Math.max(0, restaurantGross - stripeShare).toFixed(2));
  const platformFee = Number((totalCharged - restaurantPayout).toFixed(2));
  const totalChargedCentavos = Math.round(totalCharged * 100);
  const restaurantPayoutCentavos = Math.round(restaurantPayout * 100);

  return {
    subtotalWeb,
    customerFee,
    domicileTarifa: 0,
    uberFee: delivery.uberFee,
    deliverySubsidy: 0,
    deliveryDiscount: delivery.deliveryDiscount,
    totalCharged,
    restaurantPayout,
    stripeFee,
    stripeShare,
    platformFee,
    totalChargedCentavos,
    restaurantPayoutCentavos,
    applicationFeeCentavos: totalChargedCentavos - restaurantPayoutCentavos,
    deliveryFee: delivery.deliveryFee,
  };
}
