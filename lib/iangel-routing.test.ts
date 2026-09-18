import { metersFromStore } from './iangel-geo';
import { isIangelShift } from './iangel-shift';
import { resolveDeliveryRouting, needsUberQuote } from './iangel-routing';
import { calcCheckoutSplit } from './checkout-split';
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

function kinds(now: Date, meters: number, riderActive: boolean, riderBusy: boolean) {
  return resolveDeliveryRouting({
    meters,
    now,
    riderActive,
    riderBusy,
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

const at3000 = kinds(AT_15, 3000, true, false);
assert(at3000.defaultKind === 'self', '3000 m inclusive → IANGEL $50');
assert(!at3000.allowUber, '3000 m sin Uber');

const at3001 = kinds(AT_15, 3001, true, false);
assert(at3001.defaultKind === 'uber', '3001 m → Uber');
assert(!at3001.allowSelf, '3001 m sin IANGEL');

const at4000 = kinds(AT_15, 4000, true, false);
assert(at4000.defaultKind === 'uber', '4000 m inclusive → Uber');
assert(!at4000.blocked, '4000 m sí hay domicilio');

const at4001 = kinds(AT_15, 4001, true, false);
assert(at4001.blocked && at4001.defaultKind === null, '4001 m sin domicilio');

const inactive2km = kinds(AT_15, 2000, false, false);
assert(inactive2km.blocked, '≤3000 m inactivo: sin Uber');
assert(inactive2km.defaultKind === null, '≤3000 m inactivo no es Uber');

const afterShift = kinds(AT_2105, 2000, true, false);
assert(afterShift.defaultKind === 'uber', '21:05 a 2 km → Uber');
assert(!afterShift.allowSelf, 'desde las 21:00 no es IANGEL');

const atNine = kinds(AT_210000, 30, true, false);
assert(atNine.defaultKind === 'uber', '21:00 exacto a 30 m → Uber');

const afterShiftUberBand = kinds(AT_2105, 3500, true, false);
assert(afterShiftUberBand.defaultKind === 'uber', '3001–4000 m fuera de turno sigue Uber');

const lateStill = kinds(AT_205959, 2000, true, false);
assert(lateStill.defaultKind === 'self', '20:59:59 <=3000 activo+libre → $50');

const midUber = kinds(AT_15, 3500, true, false);
assert(midUber.defaultKind === 'uber', '3.5 km en turno → Uber');
assert(!midUber.allowSelf, 'más de 3 km sin $50');

const mid = kinds(AT_15, 4500, true, false);
assert(mid.blocked, '4.5 km bloqueado');
assert(mid.defaultKind === null, '4.5 km sin Uber');

const far = kinds(AT_15, 6000, true, false);
assert(far.blocked, 'más de 4 km se bloquea');
assert(far.defaultKind === null, 'más de 4 km sin Uber');

const busy = kinds(AT_15, 2000, true, true);
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
assert(selfSplit.restaurantPayout < CARTA * 0.85, 'dueño 85% menos Stripe/2');

const uberSplit = calcCheckoutSplit({
  priceBaseTotal: CARTA,
  fulfillment: 'delivery',
  provider: 'uber',
  uberFee: 80,
});
assert(uberSplit.deliveryFee === 77.6, `uber: 80 × 0.97 = 77.6, got ${uberSplit.deliveryFee}`);
assert(uberSplit.deliveryDiscount === 2.4, '3% del quote, no de la carta');

const cartaSplit = calcCheckoutSplit({
  priceBaseTotal: 99,
  fulfillment: 'pickup',
});
assert(cartaSplit.subtotalWeb === 99 && cartaSplit.deliveryFee === 0, 'recoger: carta y envío 0');

assert(
  !needsUberQuote({ meters: 3000, now: AT_15, riderActive: false, riderBusy: false, priceBaseTotal: CARTA }),
  '3000 m en turno no cotiza Uber'
);
assert(
  !needsUberQuote({ meters: 2000, now: AT_15, riderActive: true, riderBusy: false, priceBaseTotal: CARTA }),
  '2 km en turno no cotiza Uber'
);
assert(
  needsUberQuote({ meters: 2000, now: AT_2105, riderActive: true, riderBusy: false, priceBaseTotal: CARTA }),
  '2 km desde las 21:00 sí cotiza Uber'
);
assert(
  needsUberQuote({ meters: 3001, now: AT_15, riderActive: true, riderBusy: false, priceBaseTotal: CARTA }),
  '3001 m sí cotiza Uber'
);
assert(
  needsUberQuote({ meters: 4000, now: AT_15, riderActive: true, riderBusy: false, priceBaseTotal: CARTA }),
  '4000 m sí cotiza Uber'
);
assert(
  !needsUberQuote({ meters: 4001, now: AT_15, riderActive: true, riderBusy: false, priceBaseTotal: CARTA }),
  '4001 m no cotiza Uber'
);

const twoKm = metersFromStore(28.675575, -106.108617);
assert(twoKm > 1900 && twoKm < 2100, `Haversine 2km norte, got ${twoKm}`);

console.log('iangel-routing tests: ok');
