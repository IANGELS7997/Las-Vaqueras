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
}: CheckoutSplitInput): CheckoutSplit {
  const subtotalWeb = calcWebPrice(priceBaseTotal);
  const customerFee = calcCustomerFee(subtotalWeb);
  const restaurantGross = calcRestaurantPayout(priceBaseTotal);
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
