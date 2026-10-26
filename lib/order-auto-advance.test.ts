import assert from 'node:assert/strict';
import { paidOrderStatusFields, shouldAutoDeliverPickup } from '@/lib/order-auto-advance';
import { pickupArrivingSoon } from '@/lib/pickup-slots';
import { viewFromOrder } from '@/lib/order-lifecycle';

const now = Date.parse('2026-10-25T23:20:00.000Z');
const slot = '2026-10-25T23:30:00.000Z';

const base = {
  fulfillment_type: 'pickup' as const,
  status: 'preparing' as const,
  cook_hold: false,
  created_at: new Date(now - 40 * 60_000).toISOString(),
  pickup_at: slot,
};

assert.equal(paidOrderStatusFields({ fulfillment: 'pickup' }).status, 'preparing');
assert.equal(paidOrderStatusFields({ fulfillment: 'delivery' }).dispatch_status, 'self_iangel');
assert.equal(
  paidOrderStatusFields({ fulfillment: 'delivery', deliveryProvider: 'managed' }).dispatch_status,
  'managed'
);
assert.equal(
  paidOrderStatusFields({ fulfillment: 'delivery', deliveryProvider: 'uber' }).dispatch_status,
  'needs_n8n_uber'
);

assert.equal(shouldAutoDeliverPickup(base, now), false, 'preparando no se cierra solo');
assert.equal(
  shouldAutoDeliverPickup({ ...base, status: 'in_transit' }, now),
  false,
  'listo no se cierra antes de 20 min de la hora'
);
assert.equal(
  shouldAutoDeliverPickup({ ...base, status: 'in_transit' }, Date.parse('2026-10-25T23:50:00.000Z')),
  true
);
assert.equal(
  shouldAutoDeliverPickup({ ...base, status: 'in_transit', pickup_at: null, created_at: new Date(now - 10 * 60_000).toISOString() }, now),
  false
);
assert.equal(
  shouldAutoDeliverPickup({ ...base, status: 'in_transit', pickup_at: null, created_at: new Date(now - 31 * 60_000).toISOString() }, now),
  true
);

assert.equal(pickupArrivingSoon(slot, now), true);
assert.equal(pickupArrivingSoon(slot, Date.parse('2026-10-25T23:00:00.000Z')), false);

const waiting = viewFromOrder({ status: 'preparing', fulfillment: 'pickup', pickupAt: slot });
assert.equal(waiting.customerLabel, 'En cocina');
assert.match(waiting.customerDetail, /Tu orden estará lista a las/);
assert.match(waiting.customerDetail, /Si llegas antes, puede que aún lo estemos preparando/);

const ready = viewFromOrder({ status: 'in_transit', fulfillment: 'pickup', pickupAt: slot });
assert.equal(ready.customerLabel, 'Listo para recoger');
assert.equal(ready.customerDetail, 'Tu pedido está listo para recoger.');

console.log('order-auto-advance.test.ts ok');
