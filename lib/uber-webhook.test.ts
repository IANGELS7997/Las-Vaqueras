import {
  isUberIgnoredMoneyEvent,
  kitchenStatusFromUber,
  parseUberWebhook,
} from './uber-webhook';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const deliveryStatusExample = {
  account_id: '',
  created: '2023-08-01T06:28:22.695Z',
  customer_id: 'fb109f30-d2f0-5447-a0fa-884a44394axx',
  data: {
    complete: true,
    external_id: '',
    fee: 9200,
    id: 'del_QbLowiwHQM-b4e8YmOZNOw',
    kind: 'delivery',
    live_mode: true,
    manifest: { description: '1 X Small Box\n', total_value: 0 },
    status: 'delivered',
    tracking_url: 'https://www.ubereats.com/tw/orders/41b2e8c2-2c07-40cf-9be1-ef1898e64d3b',
  },
  delivery_id: 'del_QbLowiwHQM-b4e8YmOZNOw',
  id: 'evt_Bouz7BhPTYGDz9FFQNgODw',
  kind: 'event.delivery_status',
  live_mode: true,
  status: 'delivered',
};

const parsed = parseUberWebhook(deliveryStatusExample);
assert(parsed.kind === 'event.delivery_status', 'kind');
assert(parsed.deliveryId === 'del_QbLowiwHQM-b4e8YmOZNOw', 'no usar evt_ como delivery');
assert(parsed.status === 'delivered', 'status');
assert(parsed.orderId === null, 'external_id vacío no es pedido');
assert(parsed.trackingUrl?.includes('ubereats.com'), 'tracking');
assert(kitchenStatusFromUber(parsed.status) === 'delivered', 'cocina delivered');
assert(!isUberIgnoredMoneyEvent(parsed.kind), 'delivery_status sí se aplica a estado');
assert(isUberIgnoredMoneyEvent('event.refund_request'), 'refund se ignora');
assert(isUberIgnoredMoneyEvent('event.billing_update'), 'billing se ignora');

const courierUpdateExample = {
  data: {
    courier: { location: { lat: 40.71093, lng: -74.0119 } },
    external_id: '',
    fee: 9200,
    id: 'del_y_aY8RuTQ0CRKu2aFXe8qQ',
    status: 'pickup',
    tracking_url: 'https://www.ubereats.com/tw/orders/cbf698f1-1b93-4340-912a-ed9a1577bca9',
  },
  delivery_id: 'del_y_aY8RuTQ0CRKu2aFXe8qQ',
  id: 'evt_WNjLziAJT4eiOKgPsLNtbw',
  kind: 'event.courier_update',
  location: { lat: 40.71093, lng: -74.0119 },
};

const courier = parseUberWebhook(courierUpdateExample);
assert(courier.kind === 'event.courier_update', 'courier kind');
assert(courier.deliveryId === 'del_y_aY8RuTQ0CRKu2aFXe8qQ', 'courier del_');
assert(courier.status === 'pickup', 'courier status');
assert(kitchenStatusFromUber(courier.status) === 'in_transit', 'pickup → en camino');
assert(courier.courierLat === 40.71093 && courier.courierLng === -74.0119, 'coords');
assert(!isUberIgnoredMoneyEvent(courier.kind), 'courier no es evento de dinero');

console.log('uber-webhook tests: ok');
