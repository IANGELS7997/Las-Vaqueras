import assert from 'node:assert/strict';
import { cajaTicketBanner } from '@/lib/caja-ticket';

assert.equal(cajaTicketBanner({ branchId: 'norte', fulfillment: 'delivery' }), 'GESTIONAR PEDIDO');
assert.equal(cajaTicketBanner({ branchId: 'sur', fulfillment: 'delivery' }), 'GESTIONAR PEDIDO');
assert.equal(cajaTicketBanner({ branchId: 'norte', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: 'sur', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: 'centro', fulfillment: 'delivery' }), null);
assert.equal(cajaTicketBanner({ branchId: 'centro', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: null, fulfillment: 'delivery' }), null);
