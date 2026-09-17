import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
import { SELF_FEE_MXN, type DeliveryProvider } from '@/lib/iangel-constants';
import {
  calcCustomerFee,
  calcRestaurantPayout,
  calcStripeFee,
  calcStripeShare,
  calcWebPrice,
} from '@/lib/pricing';
import type { FulfillmentMode } from '@/types';

export type CheckoutSplitInput = {
  priceBaseTotal: number;
  fulfillment?: FulfillmentMode;
  platilloCount?: number;
  provider?: DeliveryProvider;
  /** Raw Uber Direct quote. Used only when provider is uber. */
  uberFee?: number;
  deliveryFee?: number;
  giftFoodCredit?: number;
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
  provider,
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
  const kind = fulfillment === 'pickup' ? 'pickup' : provider || 'uber';
  const rawUber = uberFee ?? legacyDeliveryFee ?? 0;

  let delivery = { deliveryFee: 0, deliveryDiscount: 0, uberFee: 0 };
  if (kind === 'self' || kind === 'wait_self') {
    delivery = { deliveryFee: SELF_FEE_MXN, deliveryDiscount: 0, uberFee: 0 };
  } else if (kind === 'uber') {
    const priced = calcCustomerDeliveryFee({ uberFee: rawUber });
    delivery = { ...priced, uberFee: Math.round(rawUber * 100) / 100 };
  }

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
