import {
  calcDomicileTarifa,
  calcCustomerDeliveryFee,
  calcPlatformDeliverySubsidy,
} from '@/lib/delivery-tarifa';
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
  platilloCount = 0,
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

  const domicileTarifa = calcDomicileTarifa(platilloCount);
  const deliverySubsidy = calcPlatformDeliverySubsidy(rawUber, subtotalWeb);
  const { deliveryFee, deliveryDiscount } = calcCustomerDeliveryFee({
    uberFee: rawUber,
    domicileTarifa,
    subsidy: deliverySubsidy,
  });
  const totalCharged = Number(
    (subtotalWeb + domicileTarifa + customerFee + deliveryFee).toFixed(2)
  );
  const platformFee = Number((totalCharged - restaurantPayout).toFixed(2));
  const totalChargedCentavos = Math.round(totalCharged * 100);
  const restaurantPayoutCentavos = Math.round(restaurantPayout * 100);

  return {
    subtotalWeb,
    customerFee,
    domicileTarifa,
    uberFee: rawUber,
    deliverySubsidy,
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
