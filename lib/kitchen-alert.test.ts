import assert from 'node:assert/strict';
import { kitchenAlertPlan } from '@/lib/kitchen-alert';

const fresh = {
  shiftActive: true,
  autoPrint: true,
  alreadySeen: false,
  alreadyAnnounced: false,
  status: 'preparing' as const,
};

assert.deepEqual(kitchenAlertPlan(fresh), { sound: true, print: true });
assert.deepEqual(kitchenAlertPlan({ ...fresh, status: 'pending' }), { sound: true, print: true });
assert.deepEqual(kitchenAlertPlan({ ...fresh, autoPrint: false }), { sound: true, print: false });
assert.deepEqual(kitchenAlertPlan({ ...fresh, shiftActive: false }), { sound: false, print: false });
assert.deepEqual(kitchenAlertPlan({ ...fresh, alreadySeen: true }), { sound: false, print: false });
assert.deepEqual(kitchenAlertPlan({ ...fresh, alreadyAnnounced: true }), { sound: false, print: false });
assert.deepEqual(kitchenAlertPlan({ ...fresh, status: 'delivered' }), { sound: false, print: false });
assert.deepEqual(kitchenAlertPlan({ ...fresh, status: 'in_transit' }), { sound: false, print: false });
assert.deepEqual(
  kitchenAlertPlan({ ...fresh, presentWhenShiftOpened: true }),
  { sound: false, print: true },
  'el pedido que ya estaba al abrir el turno no suena, y la comanda sí sale'
);
assert.deepEqual(
  kitchenAlertPlan({ ...fresh, presentWhenShiftOpened: true, autoPrint: false }),
  { sound: false, print: false },
  'sin impresión automática, ese pedido tampoco suena'
);
