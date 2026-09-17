import { metersFromStore } from './iangel-geo';
import { isIangelShift } from './iangel-shift';
import { resolveDeliveryRouting } from './iangel-routing';
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

const active2km = kinds(AT_15, 2000, true, false);
assert(active2km.defaultKind === 'self', 'activo 15:00 2km → $50');
assert(active2km.options.some((o) => o.kind === 'self' && o.customerFee === SELF_FEE_MXN), 'opción $50');
assert(!active2km.allowUber && !active2km.options.some((o) => o.kind === 'uber'), 'libre: sin Uber');

const inactive2km = kinds(AT_15, 2000, false, false);
assert(inactive2km.defaultKind === 'uber', 'inactivo 15:00 2km → solo uber');
assert(!inactive2km.allowSelf && !inactive2km.allowWait, 'inactivo sin $50 ni espera');

const afterShift = kinds(AT_2105, 2000, true, false);
assert(afterShift.defaultKind === 'uber', '21:05 2km NO $50');
assert(!afterShift.allowSelf && !afterShift.allowWait, 'desde 21:00 no espera ni $50');

const lateStill = kinds(AT_205959, 2000, true, false);
assert(lateStill.defaultKind === 'self', '20:59:59 <=4000 activo+libre → $50');

const mid = kinds(AT_15, 4500, true, false);
assert(mid.defaultKind === 'uber', '4.5km solo uber');
assert(!mid.allowSelf, '4001–5000 sin $50');

const far = kinds(AT_15, 6000, true, false);
assert(far.defaultKind === 'uber', 'más de 5 km sigue Uber');
assert(!far.blocked, 'más de 5 km no se bloquea');

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

const twoKm = metersFromStore(28.675575, -106.108617);
assert(twoKm > 1900 && twoKm < 2100, `Haversine 2km norte, got ${twoKm}`);

console.log('iangel-routing tests: ok');
