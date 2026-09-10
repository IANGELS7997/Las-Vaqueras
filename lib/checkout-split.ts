import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
import {
  calcCustomerFee,
  calcRestaurantPayout,
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
  const restaurantPayout = calcRestaurantPayout(priceBaseTotal);
  const rawUber = uberFee ?? legacyDeliveryFee ?? DELIVERY_FEE;

  if (fulfillment === 'pickup') {
    const totalCharged = Number((subtotalWeb + customerFee).toFixed(2));
    const platformFee = Number((totalCharged - restaurantPayout).toFixed(2));
    const totalChargedCentavos = Math.round(totalCharged * 100);
    const restaurantPayoutCentavos = Math.round(restaurantPayout * 100);
    return {
      subtotalWeb,
      customerFee,
      domicileTarifa: 0,
      uberFee: 0,
      deliverySubsidy: 0,
      deliveryDiscount: 0,
      totalCharged,
      restaurantPayout,
      platformFee,
      totalChargedCentavos,
      restaurantPayoutCentavos,
      applicationFeeCentavos: totalChargedCentavos - restaurantPayoutCentavos,
      deliveryFee: 0,
    };
  }

  const { deliveryFee, deliveryDiscount } = calcCustomerDeliveryFee({
    uberFee: rawUber,
    priceBaseTotal,
  });
  const totalCharged = Number((subtotalWeb + customerFee + deliveryFee).toFixed(2));
  const platformFee = Number((totalCharged - restaurantPayout).toFixed(2));
  const totalChargedCentavos = Math.round(totalCharged * 100);
  const restaurantPayoutCentavos = Math.round(restaurantPayout * 100);

  return {
    subtotalWeb,
    customerFee,
    domicileTarifa: 0,
    uberFee: rawUber,
    deliverySubsidy: 0,
    deliveryDiscount,
    totalCharged,
    restaurantPayout,
    platformFee,
    totalChargedCentavos,
    restaurantPayoutCentavos,
    applicationFeeCentavos: totalChargedCentavos - restaurantPayoutCentavos,
    deliveryFee,
  };
}
