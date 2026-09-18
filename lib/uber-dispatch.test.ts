import { dispatchUberDirectAfterPayment } from './uber-dispatch';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

async function main() {
  const pickup = await dispatchUberDirectAfterPayment({
    orderId: '00000000-0000-0000-0000-000000000001',
    fulfillment: 'pickup',
    provider: 'uber',
    address: 'Rio de Janeiro 903',
    lat: 28.65,
    lng: -106.1,
    phone: '6141812108',
    customerName: 'Prueba',
    items: [],
  });
  assert(pickup === null, 'recoger no pide Uber');

  const iangel = await dispatchUberDirectAfterPayment({
    orderId: '00000000-0000-0000-0000-000000000002',
    fulfillment: 'delivery',
    provider: 'self',
    address: 'Calle X 1, 31210',
    lat: 28.65,
    lng: -106.1,
    phone: '6141812108',
    customerName: 'Prueba',
    items: [],
  });
  assert(iangel === null, 'IANGEL $50 no pide Uber');

  const already = await dispatchUberDirectAfterPayment({
    orderId: '00000000-0000-0000-0000-000000000003',
    fulfillment: 'delivery',
    provider: 'uber',
    alreadyDeliveryId: 'del_already',
    address: 'Calle X 1, 31210',
    lat: 28.65,
    lng: -106.1,
    phone: '6141812108',
    customerName: 'Prueba',
    items: [],
  });
  assert(already === null, 'si ya hay delivery_id no se duplica');

  console.log('uber-dispatch tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
