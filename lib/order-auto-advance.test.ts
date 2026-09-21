import assert from 'node:assert/strict';
import {
  paidOrderStatusFields,
  PICKUP_AUTO_READY_MINUTES,
  shouldAutoDeliverPickup,
  shouldAutoReadyPickup,
} from '@/lib/order-auto-advance';

const base = {
  fulfillment_type: 'pickup' as const,
  status: 'preparing' as const,
  cook_hold: false,
  created_at: new Date(Date.now() - (PICKUP_AUTO_READY_MINUTES + 1) * 60_000).toISOString(),
  pickup_at: null as string | null,
};

assert.equal(paidOrderStatusFields({ fulfillment: 'pickup' }).status, 'preparing');
assert.equal(paidOrderStatusFields({ fulfillment: 'delivery' }).dispatch_status, 'self_iangel');
assert.equal(
  paidOrderStatusFields({ fulfillment: 'delivery', deliveryProvider: 'uber' }).dispatch_status,
  'needs_n8n_uber'
);

assert.equal(shouldAutoReadyPickup(base), true);
assert.equal(shouldAutoReadyPickup({ ...base, cook_hold: true }), false);
assert.equal(shouldAutoReadyPickup({ ...base, fulfillment_type: 'delivery' }), false);
assert.equal(
  shouldAutoReadyPickup({
    ...base,
    created_at: new Date().toISOString(),
  }),
  false
);

assert.equal(
  shouldAutoDeliverPickup({
    ...base,
    status: 'in_transit',
    created_at: new Date(Date.now() - 50 * 60_000).toISOString(),
  }),
  true
);

console.log('order-auto-advance.test.ts ok');
