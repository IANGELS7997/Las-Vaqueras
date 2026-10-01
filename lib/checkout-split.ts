import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
import { OUTER_FEE_MXN, SELF_FEE_MXN, type DeliveryProvider } from '@/lib/iangel-constants';
import {
  allocateFoodStripe,
  calcCustomerFee,
  calcDeveloperFood,
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
  /** Suma de precios ya redondeados que ve el cliente. Si falta, se marca la carta junta. */
  foodWebTotal?: number;
  /**
   * Pesos de comida que el cliente no paga (30%, 20% o Jumbo).
   * Salen del pago del dueño. El envío no entra aquí.
   */
  foodDiscountPesos?: number;
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
  foodFullWeb: number;
  foodDiscountPesos: number;
};

export function calcCheckoutSplit({
  priceBaseTotal,
  fulfillment = 'delivery',
  provider,
  uberFee,
  deliveryFee: legacyDeliveryFee,
  giftFoodCredit = 0,
  waiveFood = false,
  foodWebTotal,
  foodDiscountPesos = 0,
}: CheckoutSplitInput): CheckoutSplit {
  const discount =
    Number.isFinite(foodDiscountPesos) && foodDiscountPesos > 0
      ? Math.round(foodDiscountPesos * 100) / 100
      : 0;
  const ownerAbsorbsDiscount = discount > 0;
  const credit = ownerAbsorbsDiscount
    ? 0
    : waiveFood
      ? priceBaseTotal
      : Math.min(Math.max(0, priceBaseTotal), Math.max(0, giftFoodCredit));
  const chargedBase = Math.round((priceBaseTotal - credit) * 100) / 100;
  const subtotalWeb =
    typeof foodWebTotal === 'number' && Number.isFinite(foodWebTotal)
      ? Math.max(0, Math.round(foodWebTotal))
      : calcWebPrice(chargedBase);
  const customerFee = calcCustomerFee(subtotalWeb);
  const shareBase = ownerAbsorbsDiscount ? priceBaseTotal : chargedBase;
  const kind = fulfillment === 'pickup' ? 'pickup' : provider || 'self';
  const foodShare = kind === 'pickup' || kind === 'self' || kind === 'wait_self' || kind === 'managed';
  const rawUber = uberFee ?? 0;
  const routedFee =
    typeof legacyDeliveryFee === 'number' && Number.isFinite(legacyDeliveryFee) && legacyDeliveryFee > 0
      ? Math.round(legacyDeliveryFee)
      : SELF_FEE_MXN;

  let delivery = { deliveryFee: 0, deliveryDiscount: 0, uberFee: 0 };
  if (kind === 'managed') {
    const managedFee = routedFee > 0 && routedFee !== SELF_FEE_MXN ? routedFee : OUTER_FEE_MXN;
    delivery = { deliveryFee: managedFee, deliveryDiscount: 0, uberFee: 0 };
  } else if (kind === 'self' || kind === 'wait_self') {
    delivery = { deliveryFee: routedFee, deliveryDiscount: 0, uberFee: 0 };
  } else if (kind === 'uber') {
    const priced = calcCustomerDeliveryFee({ uberFee: rawUber });
    delivery = { ...priced, uberFee: Math.round(rawUber * 100) / 100 };
  }

  const totalCharged = Number((subtotalWeb + customerFee + delivery.deliveryFee).toFixed(2));
  const stripeFee = calcStripeFee(totalCharged);
  let stripeShare: number;
  let restaurantPayout: number;
  if (foodShare) {
    const developerGross = Math.min(calcDeveloperFood(shareBase), subtotalWeb);
    const ownerFood = Number(Math.max(0, subtotalWeb - developerGross).toFixed(2));
    const allocated = allocateFoodStripe(stripeFee, developerGross, ownerFood);
    stripeShare = allocated.ownerStripe;
    const ownerNet = Number(Math.max(0, ownerFood - allocated.ownerStripe).toFixed(2));
    restaurantPayout =
      kind === 'managed' ? Number((ownerNet + delivery.deliveryFee).toFixed(2)) : ownerNet;
  } else {
    const restaurantGross = calcRestaurantPayout(shareBase);
    stripeShare = calcStripeShare(totalCharged);
    restaurantPayout = Number(
      Math.max(0, restaurantGross - stripeShare - (ownerAbsorbsDiscount ? discount : 0)).toFixed(2)
    );
  }
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
    foodFullWeb: Number((subtotalWeb + discount).toFixed(2)),
    foodDiscountPesos: discount,
  };
}
