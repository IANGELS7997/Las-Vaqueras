import assert from 'node:assert/strict';
import {
  approvedMotoKitchenPay,
  closePlan,
  helpStepError,
  customerRefundAmount,
  customerRefundStatusMessage,
  incompleteRefundCredit,
  isOpenCustomerRefund,
  isRefundReview,
  REFUND_REVIEW_LABEL,
  rejectedMotoDebt,
  stackedPendingLabel,
} from './rider-help';

const cardLeave = closePlan('no_contact', 'card', 180);
assert.equal(cardLeave.customerDue, 0);
assert.equal(cardLeave.kitchenPay, 0);
assert.equal(cardLeave.closesTrip, false);
assert.equal(cardLeave.keepDeliveryFee, true);
assert.equal(cardLeave.lockUntil, null);

const cashLeave = closePlan('no_contact', 'cash', 180);
assert.equal(cashLeave.customerDue, 0);
assert.equal(cashLeave.kitchenPay, 255);
assert.equal(cashLeave.closesTrip, false);
assert.equal(cashLeave.lockUntil, null);

const refused = closePlan('refused_pay', 'cash', 180);
assert.equal(refused.customerLabel, 'Pago pendiente de pedido anterior');
assert.equal(refused.customerDue, 255);
assert.equal(refused.kitchenPay, 255);
assert.equal(refused.closesTrip, false);

const door = closePlan('cant_enter', 'card', 90);
assert.equal(door.keepDeliveryFee, true);
assert.equal(door.customerDue, 0);
assert.equal(door.closesTrip, false);

const unsafeCash = closePlan('unsafe', 'cash', 180, true);
assert.equal(unsafeCash.kitchenPay, 0);
assert.equal(unsafeCash.riderDebt, 180);
assert.equal(unsafeCash.customerDue, 0);
assert.equal(unsafeCash.lockUntil, 'resolve');

const unsafeEmpty = closePlan('unsafe', 'cash', 180, false);
assert.equal(unsafeEmpty.riderDebt, 0);
assert.equal(unsafeEmpty.keepDeliveryFee, true);

const motoCard = closePlan('moto', 'card', 180, false);
assert.equal(motoCard.keepDeliveryFee, true);
assert.equal(motoCard.kitchenPay, 0);
assert.equal(motoCard.riderDebt, 0);
assert.equal(motoCard.lockUntil, 'resolve');

assert.equal(rejectedMotoDebt('cash', 180), 130);
assert.equal(rejectedMotoDebt('card', 180), 50);
assert.equal(approvedMotoKitchenPay('cash', 180), 230);
assert.equal(approvedMotoKitchenPay('card', 180), 0);

assert.equal(
  stackedPendingLabel([
    'Saldo pendiente de tu pedido anterior',
    'Pago pendiente de pedido anterior',
  ]),
  'Saldo pendiente de pedidos anteriores'
);

assert.equal(
  helpStepError({
    kind: 'no_contact',
    step: 'notice',
    pay: 'card',
    leaveAtDoor: true,
    elapsed: 500,
    phase: 'dropoff',
    evidence: false,
    policeReport: '',
  }),
  'Este pedido se deja en la puerta. No aplica no poder contactar.'
);

assert.equal(
  helpStepError({
    kind: 'no_contact',
    step: 'close',
    pay: 'card',
    leaveAtDoor: false,
    elapsed: 500,
    phase: 'dropoff',
    evidence: true,
    policeReport: '',
  }),
  'La foto para irte se toma cuando el tiempo llega a 0:00'
);

assert.equal(incompleteRefundCredit({ pay: 'cash', cashFood: 110, total: 160, delivery: 50, service: 0 }), 160);
assert.equal(incompleteRefundCredit({ pay: 'card', cashFood: 0, total: 160, delivery: 50, service: 0 }), 160);
assert.equal(isRefundReview(REFUND_REVIEW_LABEL), true);
assert.equal(isRefundReview('Pedido incorrecto o incompleto'), false);
assert.equal(
  isOpenCustomerRefund({ kind: 'incomplete', customer_note: 'Faltó la salsa', resolution: null, refund_credit_mxn: null }),
  true
);
assert.equal(
  isOpenCustomerRefund({ kind: 'incomplete', customer_note: '', resolution: null, refund_credit_mxn: null }),
  false
);
assert.equal(
  isOpenCustomerRefund({ kind: 'incomplete', customer_note: 'Faltó la salsa', resolution: 'credit', refund_credit_mxn: 160 }),
  false
);
assert.equal(
  isOpenCustomerRefund({ kind: 'incomplete', customer_note: 'Faltó la salsa', resolution: 'refunded', refund_credit_mxn: null }),
  false
);
assert.deepEqual(
  customerRefundAmount({ pay: 'card', cashFood: 0, total: 180.4, delivery: 50, service: 0 }),
  { kind: 'stripe', amount: 180 }
);
assert.deepEqual(
  customerRefundAmount({ pay: 'cash', cashFood: 110, total: 160, delivery: 50, service: 0 }),
  { kind: 'credit', amount: 160 }
);
assert.equal(
  customerRefundStatusMessage({ resolution: 'refunded' }),
  'Aceptado. El total se devolvió a tu tarjeta.'
);
assert.match(customerRefundStatusMessage({ resolution: null }), /correo/);

console.log('rider-help tests: ok');
