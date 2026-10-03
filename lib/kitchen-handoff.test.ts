import assert from 'node:assert/strict';
import { acceptHandoffTap, HANDOFF_TAP_HOLD_MS, kitchenHandoff } from '@/lib/kitchen-handoff';

const base = {
  fulfillment: 'delivery',
  deliveryProvider: 'self',
  status: 'preparing',
  payMethod: 'card' as const,
  riderPaidCash: false,
  kitchenReceivedCash: false,
  pickupPhotoAt: null as string | null,
  kitchenReleasedAt: null as string | null,
};

assert.equal(kitchenHandoff({ ...base, pickupPhotoAt: null }).enabled, false);
assert.equal(kitchenHandoff({ ...base, pickupPhotoAt: '2026-10-01T12:00:00Z' }).enabled, true);

const cash = kitchenHandoff({
  ...base,
  payMethod: 'cash',
  pickupPhotoAt: '2026-10-01T12:00:00Z',
});
assert.equal(cash.enabled, false, 'efectivo sigue pidiendo las dos marcas');

assert.equal(
  kitchenHandoff({
    ...base,
    payMethod: 'cash',
    pickupPhotoAt: '2026-10-01T12:00:00Z',
    riderPaidCash: true,
    kitchenReceivedCash: true,
  }).enabled,
  true
);

assert.equal(
  kitchenHandoff({ ...base, deliveryProvider: 'managed', pickupPhotoAt: null }).enabled,
  true
);
assert.equal(kitchenHandoff({ ...base, deliveryProvider: 'managed' }).effect, 'depart');
assert.equal(kitchenHandoff({ ...base, deliveryProvider: 'managed' }).trackIndex, 0);
assert.equal(
  kitchenHandoff({ ...base, deliveryProvider: 'managed', status: 'in_transit' }).effect,
  'arrive'
);
assert.equal(
  kitchenHandoff({ ...base, deliveryProvider: 'managed', status: 'in_transit' }).label,
  'Llegó el pedido al domicilio'
);
assert.equal(kitchenHandoff({ ...base, fulfillment: 'pickup', deliveryProvider: 'pickup' }).effect, 'deliver');
assert.equal(kitchenHandoff({ ...base, status: 'delivered', pickupPhotoAt: 'x' }).visible, false);

const norte = kitchenHandoff({ ...base, deliveryProvider: 'managed', status: 'preparing' });
const sur = kitchenHandoff({ ...base, deliveryProvider: 'managed', status: 'in_transit' });
assert.equal(norte.effect, 'depart');
assert.equal(sur.effect, 'arrive');
assert.notEqual(norte.effect, sur.effect);

const started = 1_000;
const tapNorte = acceptHandoffTap(null, 'norte-1', started);
assert.equal(tapNorte.accept, true);
assert.equal(tapNorte.lock?.orderId, 'norte-1');
const tapSurWhileHeld = acceptHandoffTap(tapNorte.lock, 'sur-2', started + 300);
assert.equal(tapSurWhileHeld.accept, false);
assert.equal(tapSurWhileHeld.lock?.orderId, 'norte-1');
const tapSameWhileHeld = acceptHandoffTap(tapNorte.lock, 'norte-1', started + 300);
assert.equal(tapSameWhileHeld.accept, false);
const tapSurAfter = acceptHandoffTap(tapNorte.lock, 'sur-2', started + HANDOFF_TAP_HOLD_MS);
assert.equal(tapSurAfter.accept, true);
assert.equal(tapSurAfter.lock?.orderId, 'sur-2');
assert.equal(acceptHandoffTap(null, '  ', started).accept, false);

console.log('kitchen-handoff tests: ok');
