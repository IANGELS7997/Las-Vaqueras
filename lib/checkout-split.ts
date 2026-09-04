import {
  calcCustomerFee,
  calcRestaurantPayout,
  calcWebPrice,
  DELIVERY_FEE,
} from '@/lib/pricing';

export type CheckoutSplitInput = {
  priceBaseTotal: number;
  deliveryFee?: number;
};

export type CheckoutSplit = {
  subtotalWeb: number;
  customerFee: number;
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
  deliveryFee = DELIVERY_FEE,
}: CheckoutSplitInput): CheckoutSplit {
  const subtotalWeb = calcWebPrice(priceBaseTotal);
  const customerFee = calcCustomerFee(subtotalWeb);
  const totalCharged = subtotalWeb + customerFee + deliveryFee;
  const restaurantPayout = calcRestaurantPayout(priceBaseTotal);
  const platformFee = Number((totalCharged - restaurantPayout).toFixed(2));

  const totalChargedCentavos = Math.round(totalCharged * 100);
  const restaurantPayoutCentavos = Math.round(restaurantPayout * 100);
  const applicationFeeCentavos = totalChargedCentavos - restaurantPayoutCentavos;

  return {
    subtotalWeb,
    customerFee,
    totalCharged,
    restaurantPayout,
    platformFee,
    totalChargedCentavos,
    restaurantPayoutCentavos,
    applicationFeeCentavos,
    deliveryFee,
  };
}
