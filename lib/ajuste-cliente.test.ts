import assert from 'node:assert/strict';
import { arrivalCustomerLine, shouldSendArrivalEmail } from './arrival-email';
import { ENROUTE_LINE, nextDoorForEnroute } from './enroute-email';
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
