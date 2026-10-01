import assert from 'node:assert/strict';
import {
  approvedMotoKitchenPay,
  closePlan,
  helpStepError,
  rejectedMotoDebt,
  stackedPendingLabel,
} from './rider-help';

const cardLeave = closePlan('no_contact', 'card', 180);
assert.equal(cardLeave.customerDue, 0);
assert.equal(cardLeave.kitchenPay, 0);
assert.equal(cardLeave.keepDeliveryFee, true);
assert.equal(cardLeave.dispatchStatus, 'delivered_unclaimed');
assert.equal(cardLeave.lockUntil, null);

const cashLeave = closePlan('no_contact', 'cash', 180);
assert.equal(cashLeave.customerDue, 255);
assert.equal(cashLeave.kitchenPay, 255);
assert.equal(cashLeave.customerLabel, 'Saldo pendiente de tu pedido anterior');
assert.equal(cashLeave.lockUntil, 'payout');

const refused = closePlan('refused_pay', 'cash', 180);
assert.equal(refused.customerLabel, 'Pago pendiente de pedido anterior');
assert.equal(refused.kitchenPay, 255);

const door = closePlan('cant_enter', 'card', 90);
assert.equal(door.keepDeliveryFee, true);
assert.equal(door.customerDue, 0);

const unsafeCash = closePlan('unsafe', 'cash', 180);
assert.equal(unsafeCash.kitchenPay, 230);
assert.equal(unsafeCash.customerDue, 0);
assert.equal(unsafeCash.lockUntil, 'resolve');

const motoCard = closePlan('moto', 'card', 180);
assert.equal(motoCard.keepDeliveryFee, true);
assert.equal(motoCard.kitchenPay, 0);
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

console.log('rider-help tests: ok');
