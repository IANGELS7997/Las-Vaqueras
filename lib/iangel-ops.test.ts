import { branchById } from './branches';
import { buildIangelOpsOrder, type IangelOpsRow } from './iangel-ops';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const ITEMS = [
  {
    name: 'Hamburguesa',
    quantity: 2,
    extras: [{ name: 'Queso' }],
    removals: ['Cebolla'],
    specialInstructions: 'Sin sal',
  },
];

function row(patch: Partial<IangelOpsRow>): IangelOpsRow {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    status: 'preparing',
    customer_name: 'Ana',
    customer_phone: '6140000000',
    delivery_address: 'Calle 1',
    delivery_references: 'Portón azul',
    total_charged: 250,
    delivery_fee: 50,
    pay_method: 'card',
    short_code: 'AB12',
    branch_id: 'centro',
    items: ITEMS,
    dropoff_lat: 28.66,
    dropoff_lng: -106.11,
    fulfillment_type: 'delivery',
    delivery_provider: 'self',
    ...patch,
  };
}

const iangel = buildIangelOpsOrder(row({}));
assert(iangel && iangel.channel === null, 'IANGEL no lleva canal');
assert(iangel?.pickup.lat === branchById('centro').lat, 'IANGEL recoge en Centro');
assert(iangel?.ticket.kindLabel === 'IANGEL', 'tipo IANGEL');
assert(iangel?.ticket.items[0]?.extras[0] === 'Queso', 'extra en el ticket');
assert(iangel?.ticket.items[0]?.removals[0] === 'Cebolla', 'sin ingrediente en el ticket');
assert(iangel?.ticket.foodMxn === 200 && iangel.ticket.deliveryMxn === 50, 'comida y envío');
assert(iangel?.kitchenStatus === 'Preparando', 'estado de cocina');

const wait = buildIangelOpsOrder(row({ delivery_provider: 'wait_self' }));
assert(wait && wait.channel === null && wait.ticket.kindLabel === 'Esperar rider', 'esperar rider sigue en la cola');

const norte = buildIangelOpsOrder(
  row({
    branch_id: 'norte',
    delivery_provider: 'managed',
    delivery_fee: 55,
    total_charged: 255,
    dropoff_lat: 28.75,
    dropoff_lng: -106.13,
  })
);
assert(norte?.channel === 'cocina', 'Gestionar no se ofrece al rider');
assert(norte?.pickup.lat === branchById('norte').lat, 'recojo de Norte');
assert(norte?.dropoff.lat === 28.75, 'el pin del cliente se conserva');
assert(norte?.ticket.kindLabel === 'Gestionar pedido', 'tipo gestionar');
assert(norte?.feeMxn == null, 'Gestionar no manda el envío del rider');

const pickup = buildIangelOpsOrder(
  row({
    branch_id: 'sur',
    fulfillment_type: 'pickup',
    delivery_provider: 'pickup',
    delivery_fee: 0,
    total_charged: 180,
    dropoff_lat: null,
    dropoff_lng: null,
    delivery_address: '',
    pickup_at: '2026-10-01T20:00:00.000Z',
    pay_method: 'cash',
  })
);
assert(pickup?.channel === 'cocina', 'recoger no se ofrece al rider');
assert(pickup?.ticket.kindLabel === 'Recoger', 'tipo recoger');
assert(pickup?.address === branchById('sur').address, 'dirección de la sucursal');
assert(pickup?.dropoff.lat === branchById('sur').lat, 'recoger usa el punto de la sucursal');
assert(pickup?.ticket.pickupAt === '2026-10-01T20:00:00.000Z', 'hora de recoger');
assert(pickup?.kitchenStatus === 'Preparando', 'recoger en preparación');

const unpaid = buildIangelOpsOrder(row({ status: 'awaiting_payment' }));
assert(unpaid === null, 'sin pago no avisa al panel');

const cash = buildIangelOpsOrder(row({ pay_method: 'cash', cash_food_due: 200 }));
assert(cash?.feeMxn === 50 && cash.cashFoodDue === 200, 'efectivo IANGEL conserva el envío del rider');

console.log('iangel-ops tests: ok');
