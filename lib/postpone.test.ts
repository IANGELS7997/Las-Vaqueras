import assert from 'node:assert/strict';
import { isPostponeMinutes, postponePromise, promiseBaseMinutes } from './postpone';

assert.equal(isPostponeMinutes(10), true);
assert.equal(isPostponeMinutes(7), false);
assert.equal(promiseBaseMinutes({ fulfillment: 'pickup' }), 0);
assert.equal(promiseBaseMinutes({ fulfillment: 'delivery' }), 45);

const delivery = postponePromise({
  fulfillment: 'delivery',
  createdAt: '2026-11-01T22:00:00.000Z',
  delayMinutes: 10,
});
assert.equal(delivery.totalMinutes, 55);
assert.match(delivery.customerSentence, /10 minutos/);
assert.match(delivery.customerSentence, /55 minutos/);

const pickup = postponePromise({
  fulfillment: 'pickup',
  pickupAt: '2026-11-01T23:00:00.000Z',
  delayMinutes: 10,
});
assert.equal(pickup.totalMinutes, 10);
assert.match(pickup.customerSentence, /hora que elegiste/);

console.log('postpone ok');
