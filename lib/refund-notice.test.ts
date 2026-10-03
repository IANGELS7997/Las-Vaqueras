import assert from 'node:assert/strict';
import { customerRefundDecisionMail, refundRequestMail } from './refund-notice';

const notice = refundRequestMail({
  orderId: 'order-1',
  folio: 'AB12',
  branch: 'Sucursal Centro',
  customerName: 'Ana',
  customerPhone: '6140000000',
  payLabel: 'Tarjeta',
  amount: 180,
  reason: 'faltó un producto',
  note: 'No llegó la salsa',
  items: [{ uid: '1', menuItemId: 'a', name: 'Burrito', image: '', price_base: 80, quantity: 2, selections: [] }],
  foodPhotoUrl: 'https://example.com/comida.jpg',
  ticketPhotoUrl: 'https://example.com/ticket.jpg',
});

assert.match(notice.subject, /AB12/);
assert.match(notice.text, /Sucursal Centro/);
assert.match(notice.text, /Ana/);
assert.match(notice.text, /6140000000/);
assert.match(notice.text, /\$180\.00 MXN/);
assert.match(notice.text, /faltó un producto/);
assert.match(notice.text, /No llegó la salsa/);
assert.match(notice.text, /2× Burrito/);
assert.match(notice.text, /comida\.jpg/);
assert.match(notice.text, /ticket\.jpg/);

const accepted = customerRefundDecisionMail({
  accepted: true,
  kind: 'stripe',
  amount: 180,
  folio: 'AB12',
  customerName: 'Ana',
  note: '',
  orderId: 'order-1',
  token: 'tok',
});
assert.match(accepted.text, /vuelven a tu tarjeta/);
assert.match(accepted.text, /order-1/);

const credit = customerRefundDecisionMail({
  accepted: true,
  kind: 'credit',
  amount: 160,
  folio: 'AB12',
  customerName: 'Ana',
  note: '',
  orderId: 'order-1',
  token: null,
});
assert.match(credit.text, /próxima compra/);

console.log('refund-notice tests: ok');
