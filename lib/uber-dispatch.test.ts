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

  const tooFar = await dispatchUberDirectAfterPayment({
    orderId: '00000000-0000-0000-0000-000000000004',
    fulfillment: 'delivery',
    provider: 'uber',
    address: 'C. Escuadron 201 712, 31000',
    lat: 28.634801,
    lng: -106.067276,
    phone: '6141812108',
    customerName: 'Prueba',
    items: [],
  });
  assert(tooFar?.dispatch_status === 'needs_n8n_uber', 'más de 4500 m no crea courier');

  console.log('uber-dispatch tests: ok');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
