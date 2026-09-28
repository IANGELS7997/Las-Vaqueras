import { calcCheckoutSplit } from './checkout-split';
import {
  foodDiscountRate,
  loyaltyKindForOrdinal,
  paidOrderOrdinal,
  quoteFoodDiscount,
} from './loyalty';
import { calcDeveloperFood, calcWebPrice } from './pricing';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

assert(paidOrderOrdinal(0) === 1, 'cliente nuevo → pedido 1');
assert(paidOrderOrdinal(4) === 5, '4 pagados → pedido 5');
assert(paidOrderOrdinal(9) === 10, '9 pagados → pedido 10');
assert(paidOrderOrdinal(10) === 11, 'el pedido 11 no reinicia el ciclo');
assert(paidOrderOrdinal(14) === 15, 'el pedido 15 no repite el 20%');
assert(loyaltyKindForOrdinal(1) === 'first_30', 'pedido 1 = 30%');
assert(loyaltyKindForOrdinal(5) === 'fifth_20', 'pedido 5 = 20%');
assert(loyaltyKindForOrdinal(10) === 'tenth_jumbo', 'pedido 10 = cupón Jumbo');
assert(loyaltyKindForOrdinal(11) === null, 'pedido 11 sin promo');
assert(loyaltyKindForOrdinal(15) === null, 'pedido 15 sin promo');
assert(foodDiscountRate('first_30') === 0.3, 'tasa 30%');
assert(foodDiscountRate('fifth_20') === 0.2, 'tasa 20%');
assert(foodDiscountRate('tenth_jumbo') === 0, 'el pedido 10 no descuenta la comida');

const thirty = quoteFoodDiscount([{ uid: 'a', price_base: 100, quantity: 2 }], 0.3);
assert(calcWebPrice(100) === 110, 'carta 100 → 110');
assert(thirty.fullWeb === 220, `comida de carta ${thirty.fullWeb}`);
assert(thirty.chargedWeb === 154, `30% por unidad: 77 × 2 = 154, got ${thirty.chargedWeb}`);
assert(thirty.percentPesos === 66, `descuento ${thirty.percentPesos}`);
assert(thirty.giftPesos === 0, 'sin Jumbo');

const plain = calcCheckoutSplit({
  priceBaseTotal: 200,
  fulfillment: 'delivery',
  provider: 'self',
  foodWebTotal: thirty.fullWeb,
});
const promo = calcCheckoutSplit({
  priceBaseTotal: 200,
  fulfillment: 'delivery',
  provider: 'self',
  foodWebTotal: thirty.chargedWeb,
  foodDiscountPesos: thirty.discountPesos,
});
assert(plain.deliveryFee === 50 && promo.deliveryFee === 50, 'el envío no se descuenta');
assert(promo.subtotalWeb === 154, `Stripe cobra comida ${promo.subtotalWeb}`);
assert(promo.totalCharged === 204, `total con envío ${promo.totalCharged}`);
assert(promo.foodFullWeb === 220, 'el resumen conserva la comida de carta');
assert(
  promo.totalChargedCentavos === 20400,
  `PaymentIntent en centavos ${promo.totalChargedCentavos}`
);

const ownerDrop = Number((plain.restaurantPayout - promo.restaurantPayout).toFixed(2));
const stripeDrop = Number((plain.stripeShare - promo.stripeShare).toFixed(2));
assert(
  ownerDrop === Number((thirty.discountPesos - stripeDrop).toFixed(2)),
  `el dueño absorbe el descuento: baja ${ownerDrop}, descuento ${thirty.discountPesos}`
);

const foodMargin = (split: { platformFee: number; stripeShare: number; deliveryFee: number }) =>
  Number((split.platformFee - split.stripeShare - split.deliveryFee).toFixed(2));
assert(
  foodMargin(plain) === foodMargin(promo),
  `el margen de la carta se mantiene: ${foodMargin(plain)} vs ${foodMargin(promo)}`
);
assert(foodMargin(plain) === calcDeveloperFood(200), 'el 15% sale de la carta completa');

const fifth = quoteFoodDiscount([{ uid: 'b', price_base: 99, quantity: 1 }], 0.2);
assert(fifth.fullWeb === 109, 'comida 109');
assert(fifth.chargedWeb === 87, `20% al peso: ${fifth.chargedWeb}`);
assert(fifth.percentPesos === 22, `descuento 22, got ${fifth.percentPesos}`);

const fifthSplit = calcCheckoutSplit({
  priceBaseTotal: 99,
  fulfillment: 'pickup',
  foodWebTotal: fifth.chargedWeb,
  foodDiscountPesos: fifth.discountPesos,
});
assert(fifthSplit.deliveryFee === 0, 'recoger sigue en envío 0');
assert(fifthSplit.totalCharged === 87, `recoger cobra solo la comida descontada, got ${fifthSplit.totalCharged}`);

const jumbo = quoteFoodDiscount(
  [
    { uid: 'j', price_base: 80, quantity: 1 },
    { uid: 'o', price_base: 100, quantity: 1 },
  ],
  0,
  'j'
);
assert(jumbo.giftPesos === calcWebPrice(80), 'el Jumbo sale a precio web');
assert(jumbo.chargedWeb === calcWebPrice(100), 'la otra comida se cobra');
assert(jumbo.percentPesos === 0, 'el cupón no es un porcentaje');

const jumboSplit = calcCheckoutSplit({
  priceBaseTotal: 180,
  fulfillment: 'delivery',
  provider: 'self',
  foodWebTotal: jumbo.chargedWeb,
  foodDiscountPesos: jumbo.discountPesos,
});
assert(jumboSplit.deliveryFee === 50, 'el Jumbo no baja el envío');
assert(jumboSplit.subtotalWeb === calcWebPrice(100), 'se cobra la comida que no es regalo');

console.log('loyalty-charge ok');
