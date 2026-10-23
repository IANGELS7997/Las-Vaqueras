import assert from 'node:assert/strict';
import { arrivalCustomerLine, shouldSendArrivalEmail } from './arrival-email';
import { ENROUTE_LINE, nextDoorForEnroute } from './enroute-email';
import { trackingEtaParts } from './iangel-copy';
import { viewFromOrder } from './order-lifecycle';
import { anyBranchOpen, isBranchOpen } from './branches';
import { getOpenStatus, getRestaurantWallClock, getTodayHours } from './restaurant';

assert.equal(
  shouldSendArrivalEmail({
    action: 'arrive',
    fulfillment: 'delivery',
    email: 'cliente@correo.com',
    previousDispatch: 'en_route',
  }),
  true
);
assert.equal(
  shouldSendArrivalEmail({
    action: 'arrive',
    fulfillment: 'pickup',
    email: 'cliente@correo.com',
    previousDispatch: 'en_route',
  }),
  false
);
assert.equal(
  shouldSendArrivalEmail({
    action: 'arrive',
    fulfillment: 'delivery',
    email: 'cliente@correo.com',
    previousDispatch: 'arrived',
  }),
  false
);
assert.equal(
  shouldSendArrivalEmail({
    action: 'en_route',
    fulfillment: 'delivery',
    email: 'cliente@correo.com',
  }),
  false
);
assert.equal(
  shouldSendArrivalEmail({
    action: 'arrive',
    fulfillment: 'delivery',
    email: '  ',
  }),
  false
);

const wedOpen = new Date('2026-09-16T12:15:00-06:00');
const wedClose = new Date('2026-09-16T21:15:00-06:00');
const wedAfter = new Date('2026-09-16T21:16:00-06:00');
const thuEarly = new Date('2026-09-17T09:30:00-06:00');

assert.equal(getOpenStatus(wedOpen).isOpen, true);
assert.equal(getOpenStatus(wedClose).isOpen, true);
assert.equal(getOpenStatus(wedAfter).isOpen, false);
assert.equal(getOpenStatus(thuEarly).isOpen, false);
assert.match(getTodayHours(wedOpen), /Miércoles: 12:15pm - 9:15pm/);
assert.match(getTodayHours(thuEarly), /Jueves: 12:15pm - 9:15pm/);

const afternoon = new Date('2026-10-19T14:47:00-06:00');
const onlyCentro = new Date('2026-10-19T12:30:00-06:00');
const onlyNorte = new Date('2026-10-19T21:20:00-06:00');
const allClosed = new Date('2026-10-19T21:31:00-06:00');

assert.equal(getRestaurantWallClock(afternoon).hour, 14);
assert.equal(getRestaurantWallClock(afternoon).minute, 47);
assert.equal(isBranchOpen('centro', afternoon), true);
assert.equal(isBranchOpen('norte', afternoon), true);
assert.equal(isBranchOpen('sur', afternoon), true);
assert.equal(anyBranchOpen(afternoon), true);
assert.equal(isBranchOpen('centro', onlyCentro), true);
assert.equal(isBranchOpen('norte', onlyCentro), false);
assert.equal(isBranchOpen('sur', onlyCentro), false);
assert.equal(anyBranchOpen(onlyCentro), true);
assert.equal(isBranchOpen('centro', onlyNorte), false);
assert.equal(isBranchOpen('norte', onlyNorte), true);
assert.equal(isBranchOpen('sur', onlyNorte), false);
assert.equal(anyBranchOpen(onlyNorte), true);
assert.equal(anyBranchOpen(allClosed), false);

assert.equal(
  arrivalCustomerLine(false),
  'Tu repartidor ha llegado a tu domicilio. Por favor, recoge tu pedido dentro de 10 minutos.'
);
assert.match(arrivalCustomerLine(true), /Dejará el pedido en la puerta/);
assert.match(ENROUTE_LINE, /va en camino/);
assert.match(ENROUTE_LINE, /alrededor de 15 minutos/);
assert.doesNotMatch(ENROUTE_LINE, /35/);

const heading = viewFromOrder({ status: 'in_transit', dispatchStatus: 'en_route', etaMinutes: 12 });
assert.equal(heading.customerDetail, 'IANGEL va hacia ti.');
assert.doesNotMatch(heading.customerDetail, /\d/);

const managed = viewFromOrder({ status: 'in_transit', dispatchStatus: 'managed', etaMinutes: 12 });
assert.match(managed.customerDetail, /pronto/);
assert.doesNotMatch(managed.customerDetail, /15/);

const deliveryEta = trackingEtaParts({ fulfillment: 'delivery' });
assert.equal(deliveryEta.prefix, 'Tiempo estimado:');
assert.equal(deliveryEta.emphasis, '35-45 min');

const farEta = trackingEtaParts({ fulfillment: 'delivery', pickupAt: null });
assert.equal(farEta.emphasis, '35-45 min');

const pickupEta = trackingEtaParts({
  fulfillment: 'pickup',
  pickupAt: '2026-10-22T19:30:00-06:00',
});
assert.equal(pickupEta.prefix, 'Hora de recoger:');
assert.match(pickupEta.emphasis, /7:30/);
assert.doesNotMatch(`${pickupEta.prefix} ${pickupEta.emphasis}`, /35-45/);

const pickupOpen = trackingEtaParts({ fulfillment: 'pickup', pickupAt: null });
assert.equal(pickupOpen.prefix, 'Recoger en tienda');
assert.equal(pickupOpen.emphasis, '');

const vale = { id: 'vale', dispatchStatus: 'picked_up', email: 'vale@correo.com' };
const mama = { id: 'mama', dispatchStatus: 'picked_up', email: 'mama@correo.com' };
assert.equal(nextDoorForEnroute(['vale', 'mama'], [mama, vale])?.id, 'vale');
assert.equal(
  nextDoorForEnroute(['vale', 'mama'], [{ ...vale, enrouteEmailAt: '2026-09-28T17:00:00Z' }, mama]),
  null
);
assert.equal(
  nextDoorForEnroute(
    ['vale', 'mama'],
    [{ ...vale, dispatchStatus: 'delivered' }, mama]
  )?.id,
  'mama'
);
assert.equal(
  nextDoorForEnroute(['vale', 'mama'], [{ ...vale, dispatchStatus: 'assigned' }, mama]),
  null
);

console.log('ajuste cliente ok');
