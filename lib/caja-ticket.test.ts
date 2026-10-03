import assert from 'node:assert/strict';
import { cajaPayBanner, cajaTicketBanner } from '@/lib/caja-ticket';

assert.equal(cajaTicketBanner({ branchId: 'norte', fulfillment: 'delivery' }), 'GESTIONAR PEDIDO');
assert.equal(cajaTicketBanner({ branchId: 'sur', fulfillment: 'delivery' }), 'GESTIONAR PEDIDO');
assert.equal(cajaTicketBanner({ branchId: 'norte', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: 'sur', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: 'centro', fulfillment: 'delivery' }), null);
assert.equal(cajaTicketBanner({ branchId: 'centro', fulfillment: 'pickup' }), null);
assert.equal(cajaTicketBanner({ branchId: null, fulfillment: 'delivery' }), null);

const cash = cajaPayBanner({ payMethod: 'cash' });
assert.equal(cash.title, 'EFECTIVO');
assert.deepEqual(cash.lines, ['COBRAR EN CAJA']);

const card = cajaPayBanner({ payMethod: 'card' });
assert.equal(card.title, 'TARJETA');
assert.equal(card.lines[0], 'PAGADO EN LINEA — NO COBRAR');

const debit = cajaPayBanner({ payMethod: 'card', cardFunding: 'debit' });
assert.equal(debit.title, 'TARJETA DEBITO');

const missing = cajaPayBanner({ payMethod: null });
assert.equal(missing.title, 'TARJETA');
