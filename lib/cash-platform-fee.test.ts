import { applyCashFeeToCard, allocateCashFees, cashDeveloperFeeCentavos } from './cash-platform-fee';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

assert(cashDeveloperFeeCentavos(99, 109) === 1485, 'tradicional en efectivo anota $14.85');
assert(cashDeveloperFeeCentavos(99, 10) === 1000, 'el 15% no pasa de la comida cobrada');
assert(cashDeveloperFeeCentavos(0, 109) === 0, 'sin carta no hay comisión');

const both = allocateCashFees(8721, [
  { id: 'a', openCentavos: 1485 },
  { id: 'b', openCentavos: 2000 },
]);
assert(both.takenCentavos === 3485 && both.payoutCentavos === 5236, 'caben las dos comisiones');
assert(both.takes[0]?.centavos === 1485 && both.takes[1]?.centavos === 2000, 'se toman en orden');

const short = allocateCashFees(1000, [
  { id: 'a', openCentavos: 1485 },
  { id: 'b', openCentavos: 2000 },
]);
assert(short.takenCentavos === 1000 && short.payoutCentavos === 0, 'si no alcanza, se toma el pago del dueño');
assert(short.takes.length === 1 && short.takes[0]?.id === 'a' && short.takes[0]?.centavos === 1000, 'la más vieja se cobra primero');

const card = applyCashFeeToCard({
  totalCentavos: 10900,
  applicationFeeCentavos: 2179,
  restaurantPayoutCentavos: 8721,
  pendingExtraCentavos: 0,
  cashFeeCentavos: 1485,
});
assert(card.amountCentavos === 10900, 'el cliente de la tarjeta paga lo mismo');
assert(card.takenCentavos === 1485, 'se descuentan $14.85');
assert(card.payoutCentavos === 7236, 'al dueño le quedan $72.36');
assert(card.applicationFeeCentavos === 3664, 'el fee de plataforma sube esos $14.85');
assert(!card.skipTransfer, 'sigue habiendo transferencia');

const withDebt = applyCashFeeToCard({
  totalCentavos: 10900,
  applicationFeeCentavos: 2179,
  restaurantPayoutCentavos: 8721,
  pendingExtraCentavos: 500,
  cashFeeCentavos: 1485,
});
assert(withDebt.amountCentavos === 11400, 'el saldo del cliente sí se suma al cobro');
assert(withDebt.applicationFeeCentavos === 4164, 'el saldo del cliente no se mezcla con el 15%');
assert(withDebt.payoutCentavos === 7236, 'el dueño solo pierde el 15% del efectivo');

console.log('cash-platform-fee tests: ok');
