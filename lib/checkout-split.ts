import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
import { SELF_FEE_MXN, type DeliveryProvider } from '@/lib/iangel-constants';
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
  provider?: DeliveryProvider;
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
  provider: DeliveryProvider;
};

function deliveryForProvider(input: {
  fulfillment: FulfillmentMode;
  provider: DeliveryProvider;
  rawUber: number;
  priceBaseTotal: number;
}): { deliveryFee: number; deliveryDiscount: number; uberFee: number; provider: DeliveryProvider } {
  if (input.fulfillment === 'pickup' || input.provider === 'pickup') {
    return { deliveryFee: 0, deliveryDiscount: 0, uberFee: 0, provider: 'pickup' };
  }
  if (input.provider === 'self' || input.provider === 'wait_self') {
    return {
      deliveryFee: SELF_FEE_MXN,
      deliveryDiscount: 0,
      uberFee: 0,
      provider: input.provider,
    };
  }
  const calc = calcCustomerDeliveryFee({
    uberFee: input.rawUber,
    priceBaseTotal: input.priceBaseTotal,
  });
  return {
    ...calc,
    uberFee: input.rawUber,
    provider: 'uber',
  };
}

export function calcCheckoutSplit({
  priceBaseTotal,
  fulfillment = 'delivery',
  uberFee,
  deliveryFee: legacyDeliveryFee,
  giftFoodCredit = 0,
  waiveFood = false,
  provider: providerInput,
}: CheckoutSplitInput): CheckoutSplit {
  const credit = waiveFood
    ? priceBaseTotal
    : Math.min(Math.max(0, priceBaseTotal), Math.max(0, giftFoodCredit));
  const chargedBase = Math.round((priceBaseTotal - credit) * 100) / 100;
  const subtotalWeb = calcWebPrice(chargedBase);
  const customerFee = calcCustomerFee(subtotalWeb);
  const restaurantGross = calcRestaurantPayout(chargedBase);
  const rawUber = uberFee ?? legacyDeliveryFee ?? DELIVERY_FEE;
  const provider: DeliveryProvider =
    fulfillment === 'pickup' ? 'pickup' : providerInput || 'uber';

  const delivery = deliveryForProvider({
    fulfillment,
    provider,
    rawUber,
    priceBaseTotal,
  });

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
    provider: delivery.provider,
  };
}
