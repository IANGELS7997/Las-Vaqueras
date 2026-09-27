import assert from 'node:assert/strict';
import { shouldSendArrivalEmail } from './arrival-email';
import { getOpenStatus, getTodayHours } from './restaurant';

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

console.log('ajuste cliente ok');
