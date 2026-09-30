import { calcCheckoutSplit } from './checkout-split';
import {
  ADRIAN_DELIVERY_FEE_ACCOUNT,
  assertCashPickup,
  cashCheckoutAllowed,
  cashStoredAmounts,
  deliveryFeeSettlement,
  kitchenCashPatch,
  collectDoorPatch,
  doorCollectAmounts,
  paidCashPatch,
} from './iangel-cash';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const split = calcCheckoutSplit({
  priceBaseTotal: 200,
  fulfillment: 'delivery',
  provider: 'self',
  foodWebTotal: 180,
});
assert(split.subtotalWeb === 180, 'la comida de prueba es $180');

const allowed = cashCheckoutAllowed({
  provider: 'self',
  fulfillment: 'delivery',
  subtotalWeb: split.subtotalWeb,
});
assert(allowed.ok === true, 'tope de $180 pasa');
const amounts = cashStoredAmounts(split.subtotalWeb);
assert(amounts.cashFoodDue === 180, 'se guarda 180');
assert(amounts.doorDue === 230, 'en la puerta cobra 230');
assert(amounts.restaurantPayout === 180, 'en la tienda queda la comida');
assert(amounts.platformFee === 0, 'el 15% del efectivo no pasa por la plataforma');

const atCap = cashCheckoutAllowed({ provider: 'wait_self', fulfillment: 'delivery', subtotalWeb: 500 });
assert(atCap.ok === true, '$500 todavía es efectivo');
const over = cashCheckoutAllowed({ provider: 'self', fulfillment: 'delivery', subtotalWeb: 501 });
assert(over.ok === false, '$501 rechaza efectivo');
assert(cashCheckoutAllowed({ provider: 'uber', fulfillment: 'delivery', subtotalWeb: 180 }).ok === false, 'Uber no es efectivo');
assert(cashCheckoutAllowed({ provider: 'self', fulfillment: 'pickup', subtotalWeb: 180 }).ok === false, 'recoger no es efectivo');

const cashOrder = {
  payMethod: 'cash',
  cashFoodDue: 180,
  riderPaidCash: false,
  kitchenReceivedCash: false,
  dispatchStatus: 'assigned',
  riderKey: '6141921662',
};

let pickupFailed = false;
try {
  assertCashPickup(cashOrder);
} catch {
  pickupFailed = true;
}
assert(pickupFailed, 'pickup en efectivo sin las dos marcas falla');

let missingKitchen = false;
try {
  assertCashPickup({ ...cashOrder, riderPaidCash: true });
} catch {
  missingKitchen = true;
}
assert(missingKitchen, 'pickup sin la marca de cocina falla');

assertCashPickup({ ...cashOrder, riderPaidCash: true, kitchenReceivedCash: true });

const paid = paidCashPatch(cashOrder, '6141921662');
assert(paid.rider_paid_cash === true, 'paid_cash marca al rider');
assert(!('dispatch_status' in paid), 'paid_cash no cambia dispatch_status');

let twice = false;
try {
  paidCashPatch({ ...cashOrder, riderPaidCash: true }, '6141921662');
} catch {
  twice = true;
}
assert(twice, 'paid_cash es una sola vez');

let otherRider = false;
try {
  paidCashPatch(cashOrder, 'angel');
} catch {
  otherRider = true;
}
assert(otherRider, 'otro rider no marca el efectivo');

const angelCard = deliveryFeeSettlement({
  id: 'order-angel',
  payMethod: 'card',
  riderKey: 'angel',
  deliveryProvider: 'self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(angelCard.transfer.kind === 'none', 'Angel no crea Transfer');
assert(angelCard.notice?.feeStatus === 'retained_platform', 'los $50 se quedan en la plataforma');
assert(angelCard.notice?.feeDestination === 'platform', 'destino plataforma');
assert(angelCard.notice?.feeReviewed === true, 'Angel ya está revisado');

const adrianCard = deliveryFeeSettlement({
  id: 'order-adrian',
  payMethod: 'card',
  riderKey: '6141921662',
  deliveryProvider: 'self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(adrianCard.transfer.kind === 'transfer', 'Adrián crea Transfer');
if (adrianCard.transfer.kind === 'transfer') {
  assert(adrianCard.transfer.amountCentavos === 5000, 'son 5000 centavos');
  assert(adrianCard.transfer.idempotencyKey === 'order:order-adrian:rider_fee', 'una sola clave');
  assert(adrianCard.transfer.destination === ADRIAN_DELIVERY_FEE_ACCOUNT, 'cuenta de Adrián');
  assert(adrianCard.transfer.destination === 'acct_1UDqrILSkdFzTSOj', 'Express que ya existe');
  assert(!('source_transaction' in adrianCard.transfer), 'sin source_transaction');
}
const adrianPrefixed = deliveryFeeSettlement({
  id: 'order-adrian',
  payMethod: 'card',
  riderKey: '+52 614 192 1662',
  deliveryProvider: 'wait_self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(adrianPrefixed.transfer.kind === 'transfer', 'el teléfono con 52 sigue siendo Adrián');
assert(adrianCard.notice?.feeStatus === 'transferred', 'aviso de Transfer');
assert(adrianCard.notice?.feeDestination === 'rider_bank', 'destino banco del rider');

const otherCard = deliveryFeeSettlement({
  id: 'order-other',
  payMethod: null,
  riderKey: 'rider-nuevo',
  deliveryProvider: 'self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(otherCard.transfer.kind === 'none', 'sin cuenta no hay Transfer');
assert(otherCard.notice?.feeStatus === 'pending_verification', 'queda pendiente de verificación');
assert(otherCard.notice?.feeDestination === 'rider_connect', 'destino Connect del rider');
assert(otherCard.notice?.payMethod === 'card', 'sin forma de pago se trata como tarjeta');

const cashDoor = deliveryFeeSettlement({
  id: 'order-cash',
  payMethod: 'cash',
  riderKey: '6141921662',
  deliveryProvider: 'self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(cashDoor.transfer.kind === 'none', 'efectivo no llama a Stripe');
assert(cashDoor.notice?.feeStatus === 'settled_cash', 'el envío se cobra en la puerta');
assert(cashDoor.notice?.feeDestination === 'cash_door', 'destino efectivo');
assert(cashDoor.notice?.feeReviewed === false, 'Adrián en efectivo queda por revisar');
assert(cashDoor.notice?.feeMxn === 50, 'siguen siendo $50');

const cashAngel = deliveryFeeSettlement({
  id: 'order-cash-angel',
  payMethod: 'cash',
  riderKey: 'angel',
  deliveryProvider: 'self',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(cashAngel.transfer.kind === 'none', 'Angel en efectivo tampoco llama a Stripe');
assert(cashAngel.notice?.feeReviewed === true, 'Angel en efectivo ya está revisado');

const uber = deliveryFeeSettlement({
  id: 'order-uber',
  payMethod: 'card',
  riderKey: 'angel',
  deliveryProvider: 'uber',
  fulfillment: 'delivery',
  status: 'delivered',
});
assert(uber.notice === null && uber.transfer.kind === 'none', 'Uber no manda estos $50');

const pickup = deliveryFeeSettlement({
  id: 'order-pickup',
  payMethod: 'card',
  riderKey: 'angel',
  deliveryProvider: 'self',
  fulfillment: 'pickup',
  status: 'delivered',
});
assert(pickup.notice === null && pickup.transfer.kind === 'none', 'recoger no manda estos $50');

const corrected = kitchenCashPatch(cashOrder, { kitchenReceivedCash: true });
assert(corrected.kitchen_received_cash === true, 'cocina marca la recepción');
let afterPickup = false;
try {
  kitchenCashPatch(
    { ...cashOrder, dispatchStatus: 'picked_up', kitchenReceivedCash: true },
    { kitchenReceivedCash: false }
  );
} catch {
  afterPickup = true;
}
assert(afterPickup, 'después de Recogí no se borra la marca');

const door = doorCollectAmounts(180.4);
assert(door.comida === 180 && door.puerta === 230, 'la puerta es comida redondeada más 50');
const marked = collectDoorPatch({
  ...cashOrder,
  dispatchStatus: 'waiting_customer',
  leaveAtDoor: false,
});
assert(typeof marked.cash_door_collected_at === 'string', 'collect_door guarda la hora');
let early = false;
try {
  collectDoorPatch({ ...cashOrder, dispatchStatus: 'picked_up' });
} catch {
  early = true;
}
assert(early, 'no se cobra en puerta antes de entregar');
const atDoorLeave = collectDoorPatch({
  ...cashOrder,
  dispatchStatus: 'arrived',
  leaveAtDoor: true,
});
assert(Boolean(atDoorLeave.cash_door_collected_at), 'dejar en puerta se cobra al llegar');

console.log('iangel-cash ok');
