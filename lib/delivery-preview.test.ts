import { calcCheckoutSplit, summarizeDeliveryPreview } from './checkout-split';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const foodWeb = 76;
const discount = 33;
const base = {
  priceBaseTotal: 99,
  fulfillment: 'delivery' as const,
  foodWebTotal: foodWeb,
  foodDiscountPesos: discount,
};

const unquoted = calcCheckoutSplit(base);
assert(unquoted.deliveryFee === 50, 'sin tarifa el cálculo interno sigue en el envío de casa');
assert(unquoted.subtotalWeb === foodWeb, 'la comida cobrada no incluye el envío');

const hidden = summarizeDeliveryPreview({
  isPickup: false,
  quotedFee: null,
  foodCharged: unquoted.subtotalWeb + unquoted.customerFee,
  quotedDeliveryFee: unquoted.deliveryFee,
  quotedTotal: unquoted.totalCharged,
});
assert(hidden.deliveryFee === null, 'sin cruz, Envío no muestra precio');
assert(hidden.totalCharged === foodWeb, `sin cruz el total es la comida, got ${hidden.totalCharged}`);
assert(hidden.totalCharged !== unquoted.totalCharged, 'el total del resumen no usa los $50 de relleno');

for (const fee of [39, 49, 55, 50]) {
  const quoted = calcCheckoutSplit({
    ...base,
    provider: fee === 50 ? 'self' : 'managed',
    deliveryFee: fee,
  });
  const shown = summarizeDeliveryPreview({
    isPickup: false,
    quotedFee: fee,
    foodCharged: quoted.subtotalWeb + quoted.customerFee,
    quotedDeliveryFee: quoted.deliveryFee,
    quotedTotal: quoted.totalCharged,
  });
  assert(shown.deliveryFee === fee, `envío cotizado $${fee}, got ${shown.deliveryFee}`);
  assert(shown.totalCharged === foodWeb + fee, `total $${foodWeb + fee}, got ${shown.totalCharged}`);
}

const whileQuoting = summarizeDeliveryPreview({
  isPickup: false,
  quotedFee: null,
  foodCharged: foodWeb,
  quotedDeliveryFee: 39,
  quotedTotal: foodWeb + 39,
});
assert(whileQuoting.deliveryFee === null && whileQuoting.totalCharged === foodWeb, 'al cotizar no se adelanta el envío');

const pickup = summarizeDeliveryPreview({
  isPickup: true,
  quotedFee: null,
  foodCharged: foodWeb,
  quotedDeliveryFee: 50,
  quotedTotal: foodWeb + 50,
});
assert(pickup.deliveryFee === 0 && pickup.totalCharged === foodWeb, 'recoger sigue en envío $0');

console.log('delivery preview ok');
