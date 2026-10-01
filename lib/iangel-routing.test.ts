import { metersFromStore } from './iangel-geo';
import { isIangelShift } from './iangel-shift';
import { resolveDeliveryRouting, needsUberQuote } from './iangel-routing';
import { calcCheckoutSplit } from './checkout-split';
import { calcDeveloperFood, calcRestaurantPayout, calcWebPrice } from './pricing';
import { chargedFoodWeb } from './gift-cart';
import { SELF_FEE_MXN } from './iangel-constants';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const AT_15 = new Date('2026-09-15T15:00:00-06:00');
const AT_205959 = new Date('2026-09-15T20:59:59-06:00');
const AT_210000 = new Date('2026-09-15T21:00:00-06:00');
const AT_2105 = new Date('2026-09-15T21:05:00-06:00');
const CARTA = 200;
const UBER_QUOTE = 80;

function kinds(now: Date, meters: number, riderActive: boolean, riderBusy: boolean, uberDirectEnabled = false) {
  return resolveDeliveryRouting({
    meters,
    now,
    riderActive,
    riderBusy,
    uberDirectEnabled,
    priceBaseTotal: CARTA,
    uberQuoteFee: UBER_QUOTE,
  });
}

assert(isIangelShift(AT_15), '15:00 debe ser turno IANGEL');
assert(isIangelShift(AT_205959), '20:59:59 sigue en turno');
assert(!isIangelShift(AT_210000), '21:00:00 ya no es turno');
assert(!isIangelShift(AT_2105), '21:05 no es turno');

const atStore = kinds(AT_15, 30, true, false);
assert(atStore.defaultKind === 'self', '30 m → IANGEL');

const at4000 = kinds(AT_15, 4000, true, false);
assert(at4000.defaultKind === 'self', '4000 m inclusive → IANGEL $50');
assert(!at4000.allowUber, '4000 m sin Uber');

const at4001 = kinds(AT_15, 4001, true, false, true);
assert(at4001.defaultKind === 'managed' && at4001.options[0]?.customerFee === 55, '4001 m → gestionar $55');
assert(!at4001.allowSelf && !at4001.allowUber, '4001 m no entra a IANGEL');
assert(at4001.options[0]?.title === 'Envío', 'el cliente ve Envío');

const at4500 = kinds(AT_15, 4500, true, false, true);
assert(at4500.defaultKind === 'managed' && at4500.options[0]?.customerFee === 55, '4500 m → gestionar $55');
assert(!at4500.blocked, '4500 m sí hay domicilio');
assert(!at4500.farZone, '4500 m sigue en el aviso de 45 min');

const at4500Off = kinds(AT_15, 4500, false, false, false);
assert(at4500Off.defaultKind === 'managed' && !at4500Off.blocked, '4500 m no depende del rider');

const at4501 = kinds(AT_15, 4501, true, false, true);
assert(at4501.defaultKind === 'managed' && at4501.farZone, '4501 m → gestionar y aviso de 1 hora');

const at4501Off = kinds(AT_15, 4501, false, true, false);
assert(at4501Off.defaultKind === 'managed' && at4501Off.farZone, '4501 m ignora rider ocupado');

const inactive2km = kinds(AT_15, 2000, false, false, true);
assert(inactive2km.blocked && inactive2km.defaultKind === null, '≤4000 m inactivo → sin domicilio');

const coveredNear = kinds(AT_15, 30, true, false, true);
assert(coveredNear.defaultKind === 'self' && coveredNear.allowSelf, 'en turno a 30 m → IANGEL');

const afterShift = kinds(AT_2105, 2000, true, false, true);
assert(afterShift.blocked, '21:05 a 2 km → sin domicilio');
assert(!afterShift.allowSelf, 'desde las 21:00 no es IANGEL');

const atNine = kinds(AT_210000, 30, true, false, true);
assert(atNine.blocked, '21:00 exacto a 30 m → sin domicilio');

const afterShiftUberBand = kinds(AT_2105, 4200, true, false, true);
assert(afterShiftUberBand.blocked, '4001–4500 m fuera de turno → sin domicilio');

const afterShiftNear = kinds(AT_2105, 3500, true, false, true);
assert(afterShiftNear.blocked, '0–4000 m fuera de turno → sin domicilio');

const lateStill = kinds(AT_205959, 3500, true, false);
assert(lateStill.defaultKind === 'self', '20:59:59 <=4000 activo+libre → $50');

const midSelf = kinds(AT_15, 3500, true, false);
assert(midSelf.defaultKind === 'self', '3.5 km en turno → IANGEL $50');
assert(!midSelf.allowUber, '3.5 km en turno sin Uber');

const midUber = kinds(AT_15, 4200, true, false, true);
assert(midUber.defaultKind === 'managed' && midUber.options[0]?.customerFee === 55, '4.2 km → gestionar $55');
assert(!midUber.allowUber && !midUber.allowSelf, 'más de 4 km no es IANGEL');

const mid = kinds(AT_15, 4600, false, false);
assert(mid.defaultKind === 'managed' && mid.farZone, '4.6 km → gestionar y 1 hora');

const at5500 = kinds(AT_15, 5500, false, true, false);
assert(at5500.defaultKind === 'managed' && at5500.options[0]?.customerFee === 55, '5500 m → gestionar $55');

const at6500 = kinds(AT_15, 6500, false, false, false);
assert(at6500.defaultKind === 'managed' && at6500.options[0]?.customerFee === 55, '6500 m inclusive → gestionar $55');

const far = kinds(AT_15, 6501, true, false, true);
assert(far.blocked, 'más de 6.5 km se bloquea');
assert(far.defaultKind === null && !far.farZone, 'más de 6.5 km sin domicilio');

const busy = kinds(AT_15, 3500, true, true);
assert(busy.allowWait && busy.options.some((o) => o.kind === 'wait_self'), 'ocupado: espera $50');
assert(!busy.allowUber && !busy.options.some((o) => o.kind === 'uber'), 'ocupado: sin Uber');
assert(!busy.allowSelf, 'ocupado no ofrece $50 inmediato');

const selfSplit = calcCheckoutSplit({
  priceBaseTotal: CARTA,
  fulfillment: 'delivery',
  provider: 'self',
});
assert(selfSplit.deliveryFee === 50, 'self cobra $50 al cliente');
assert(selfSplit.deliveryDiscount === 0, 'IANGEL sin 3%');
assert(
  selfSplit.restaurantPayout ===
    Number((calcWebPrice(CARTA) - calcDeveloperFood(CARTA) - selfSplit.stripeShare).toFixed(2)),
  'IANGEL: dueño se queda la comida menos el 15% y su Stripe'
);

const uberSplit = calcCheckoutSplit({
  priceBaseTotal: CARTA,
  fulfillment: 'delivery',
  provider: 'uber',
  uberFee: 80,
});
assert(uberSplit.deliveryFee === 77.6, `uber: 80 × 0.97 = 77.6, got ${uberSplit.deliveryFee}`);
assert(uberSplit.deliveryDiscount === 2.4, '3% del quote, no de la carta');
assert(
  uberSplit.restaurantPayout ===
    Number((calcRestaurantPayout(CARTA) - uberSplit.stripeShare).toFixed(2)),
  'Uber conserva 90% de la carta menos Stripe/2'
);

const cartaSplit = calcCheckoutSplit({
  priceBaseTotal: 99,
  fulfillment: 'pickup',
});
assert(calcWebPrice(99) === 109, `tradicional $99 → $109, got ${calcWebPrice(99)}`);
assert(calcWebPrice(100) === 110, `carta $100 → $110, got ${calcWebPrice(100)}`);
assert(
  cartaSplit.subtotalWeb === 109 && cartaSplit.deliveryFee === 0,
  `recoger: carta×1.10 al peso y envío 0 (got ${cartaSplit.subtotalWeb})`
);
const burgerDelivery = calcCheckoutSplit({
  priceBaseTotal: 99,
  foodWebTotal: 109,
  fulfillment: 'delivery',
  provider: 'self',
});
assert(burgerDelivery.totalCharged === 159, 'tradicional a domicilio cobra 159');
assert(burgerDelivery.deliveryFee === 50, 'el envío de 50 no cambia');
assert(burgerDelivery.stripeFee === 10.12, `Stripe del 159 es 10.12, got ${burgerDelivery.stripeFee}`);
assert(burgerDelivery.stripeShare === 8.74, `Stripe del dueño 8.74, got ${burgerDelivery.stripeShare}`);
assert(burgerDelivery.restaurantPayout === 85.41, `dueño domicilio 85.41, got ${burgerDelivery.restaurantPayout}`);
assert(
  Number((burgerDelivery.platformFee - burgerDelivery.stripeFee - burgerDelivery.deliveryFee).toFixed(2)) === 13.47,
  'desarrollador domicilio queda en 13.47 después de su Stripe'
);
const burgerPickup = calcCheckoutSplit({
  priceBaseTotal: 99,
  foodWebTotal: 109,
  fulfillment: 'pickup',
});
assert(burgerPickup.stripeShare === 6.94, `Stripe del dueño en recoger 6.94, got ${burgerPickup.stripeShare}`);
assert(burgerPickup.restaurantPayout === 87.21, `dueño recoger 87.21, got ${burgerPickup.restaurantPayout}`);
const lineFood = chargedFoodWeb([
  { uid: 'a', menuItemId: 'x', price_base: 4, quantity: 3 },
]);
assert(lineFood === 12, `tres precios de $4 se redondean por línea a $12, got ${lineFood}`);
assert(
  calcCheckoutSplit({ priceBaseTotal: 12, fulfillment: 'pickup', foodWebTotal: lineFood }).subtotalWeb === 12,
  'el cobro usa la suma de líneas, no el redondeo del total'
);

assert(
  !needsUberQuote({
    meters: 4001,
    now: AT_15,
    riderActive: true,
    riderBusy: false,
    uberDirectEnabled: true,
    priceBaseTotal: CARTA,
  }),
  'ya no se cotiza Uber'
);

const twoKm = metersFromStore(28.675575, -106.108617);
assert(twoKm > 1900 && twoKm < 2100, `Haversine 2km norte, got ${twoKm}`);

assert(
  !needsUberQuote({
    meters: 2000,
    now: AT_2105,
    riderActive: false,
    riderBusy: false,
    uberDirectEnabled: false,
    priceBaseTotal: CARTA,
  }),
  'fuera de turno + Uber OFF: no cotiza'
);

const afterShiftUberOff = kinds(AT_2105, 2000, false, false, false);
assert(afterShiftUberOff.blocked && !afterShiftUberOff.allowUber, '21:05 Uber OFF → sin domicilio');

const inBandUberOff = kinds(AT_15, 4200, false, false, false);
assert(inBandUberOff.defaultKind === 'managed' && inBandUberOff.options[0]?.customerFee === 55, '4001–4500 → gestionar $55');

const managedSplit = calcCheckoutSplit({
  priceBaseTotal: CARTA,
  fulfillment: 'delivery',
  provider: 'managed',
});
assert(managedSplit.deliveryFee === 55, 'gestionar cobra $55');
assert(
  managedSplit.restaurantPayout ===
    Number(
      (
        calcWebPrice(CARTA) -
        calcDeveloperFood(CARTA) -
        managedSplit.stripeShare +
        managedSplit.deliveryFee
      ).toFixed(2)
    ),
  'gestionar: dueño recibe comida menos 15% y su Stripe, más los $55'
);

const selfWhileUberOff = kinds(AT_15, 2000, true, false, false);
assert(selfWhileUberOff.defaultKind === 'self', 'en turno online → IANGEL');

const offlineNear = kinds(AT_15, 2000, false, false, true);
assert(offlineNear.blocked, 'offline en turno → sin domicilio');

const offlineUberOff = kinds(AT_15, 2000, false, false, false);
assert(offlineUberOff.blocked && !offlineUberOff.allowUber, 'offline en turno + Uber OFF → sin domicilio');

function branchKinds(branchId: 'norte' | 'sur', now: Date, meters: number) {
  return resolveDeliveryRouting({
    meters,
    now,
    riderActive: false,
    riderBusy: false,
    priceBaseTotal: CARTA,
    branchId,
  });
}

const norteNear = branchKinds('norte', AT_15, 2000);
assert(norteNear.defaultKind === 'managed' && norteNear.options[0]?.customerFee === 50, 'Norte 2 km es gestionar $50');
assert(!norteNear.allowSelf, 'Norte no entra a IANGEL');

const norteFar = branchKinds('norte', AT_15, 5000);
assert(norteFar.defaultKind === 'managed' && norteFar.options[0]?.customerFee === 55 && norteFar.farZone, 'Norte 5 km es gestionar $55');

const norteClosed = branchKinds('norte', new Date('2026-09-15T12:30:00-06:00'), 1000);
assert(norteClosed.blocked, 'Norte antes de la 1 pm no tiene domicilio');

const surEdge = branchKinds('sur', new Date('2026-09-15T21:15:00-06:00'), 4000);
assert(surEdge.defaultKind === 'managed' && surEdge.options[0]?.customerFee === 50, 'Sur a las 9:15 pm sigue abierto');

const norteManaged50 = calcCheckoutSplit({
  priceBaseTotal: CARTA,
  fulfillment: 'delivery',
  provider: 'managed',
  deliveryFee: SELF_FEE_MXN,
});
assert(norteManaged50.deliveryFee === 50, 'gestionar de $50 se queda en $50');
assert(
  norteManaged50.restaurantPayout ===
    Number(
      (
        calcWebPrice(CARTA) -
        calcDeveloperFood(CARTA) -
        norteManaged50.stripeShare +
        50
      ).toFixed(2)
    ),
  'Norte/Sur: Adrian recibe la comida menos el 15% y su Stripe, más el envío'
);

console.log('iangel-routing tests: ok');
