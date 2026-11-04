import assert from 'node:assert/strict';
import { DEVELOPER_ORDER_COPY } from '@/lib/customer-mail';
import type { PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { buildKitchenNotice } from '@/lib/kitchen-notice-email';
import {
  kitchenActionNotices,
  kitchenNoticeLead,
  kitchenProgressLabel,
  type KitchenNoticeRow,
} from '@/lib/kitchen-notice';

function row(patch: Partial<KitchenNoticeRow>): KitchenNoticeRow {
  return { status: 'preparing', fulfillment_type: 'delivery', ...patch };
}

assert.equal(kitchenProgressLabel(row({})), 'Preparando');
assert.equal(kitchenProgressLabel(row({ kitchen_accepted_at: '2026-11-04T18:00:00.000Z' })), 'Cocina aceptó');
assert.equal(
  kitchenProgressLabel(row({ kitchen_accepted_at: '2026-11-04T18:00:00.000Z', kitchen_released_at: '2026-11-04T18:05:00.000Z' })),
  'Salida autorizada'
);
assert.equal(kitchenProgressLabel(row({ status: 'in_transit' })), 'En camino');
assert.equal(kitchenProgressLabel(row({ status: 'in_transit', fulfillment_type: 'pickup' })), 'Listo para recoger');
assert.equal(
  kitchenProgressLabel(row({ status: 'in_transit', handoff_pin: '4821', kitchen_accepted_at: '2026-11-04T18:00:00.000Z' })),
  'En camino · Clave enviada'
);
assert.equal(kitchenProgressLabel(row({ status: 'delivered', handoff_pin: '4821' })), 'Entregado');
assert.equal(kitchenProgressLabel(row({ status: 'cancelled', kitchen_accepted_at: '2026-11-04T18:00:00.000Z' })), 'Cancelado');

assert.deepEqual(
  kitchenActionNotices({ acceptNewlySaved: true, releaseNewlySaved: false, previousStatus: 'preparing', nextStatus: 'preparing' }),
  ['accepted']
);
assert.deepEqual(
  kitchenActionNotices({ acceptNewlySaved: false, releaseNewlySaved: false, previousStatus: 'preparing', nextStatus: 'preparing' }),
  []
);
assert.deepEqual(
  kitchenActionNotices({ acceptNewlySaved: false, releaseNewlySaved: true, previousStatus: 'preparing', nextStatus: 'preparing' }),
  ['handed']
);
assert.deepEqual(
  kitchenActionNotices({
    acceptNewlySaved: false,
    releaseNewlySaved: false,
    managedStep: 'depart',
    previousStatus: 'preparing',
    nextStatus: 'in_transit',
  }),
  ['handed']
);
assert.deepEqual(
  kitchenActionNotices({
    acceptNewlySaved: false,
    releaseNewlySaved: false,
    managedStep: 'arrive',
    previousStatus: 'in_transit',
    nextStatus: 'delivered',
  }),
  ['finished']
);
assert.deepEqual(
  kitchenActionNotices({ acceptNewlySaved: false, releaseNewlySaved: false, previousStatus: 'preparing', nextStatus: 'in_transit' }),
  ['handed']
);
assert.deepEqual(
  kitchenActionNotices({ acceptNewlySaved: false, releaseNewlySaved: false, previousStatus: 'preparing', nextStatus: 'delivered' }),
  ['finished']
);
assert.deepEqual(
  kitchenActionNotices({
    acceptNewlySaved: false,
    releaseNewlySaved: false,
    managedStep: 'depart',
    previousStatus: 'in_transit',
    nextStatus: 'in_transit',
  }),
  []
);

assert.equal(kitchenNoticeLead('accepted', row({})), 'Cocina aceptó el pedido.');
assert.equal(
  kitchenNoticeLead('handed', row({ status: 'in_transit', fulfillment_type: 'pickup' })),
  'Cocina marcó el pedido listo para recoger.'
);
assert.equal(
  kitchenNoticeLead('handed', row({ kitchen_released_at: '2026-11-04T18:05:00.000Z' })),
  'Cocina autorizó la salida.'
);
assert.equal(kitchenNoticeLead('handed', row({ status: 'in_transit' })), 'Cocina entregó el pedido.');
assert.equal(kitchenNoticeLead('finished', row({ status: 'delivered' })), 'Cocina finalizó el pedido.');

const mail = buildKitchenNotice(
  {
    id: 'order-1',
    short_code: 'AB12',
    customer_name: 'Ana López',
    customer_email: 'ana@example.com',
    customer_phone: '6140000000',
    branch_id: 'centro',
    delivery_provider: 'managed',
    fulfillment_type: 'delivery',
    delivery_address: 'Rio 1',
    delivery_references: '',
    items: [],
    total_charged: 100,
    delivery_fee: 50,
    pay_method: 'card',
    restaurant_payout: 80,
    platform_fee: 20,
    created_at: '2026-11-04T18:00:00.000Z',
    status: 'preparing',
    kitchen_accepted_at: '2026-11-04T18:00:00.000Z',
  } as unknown as PurchaseNoticeRow,
  'accepted'
);
assert.equal(mail.to, DEVELOPER_ORDER_COPY);
assert.equal(mail.to, 'iangels7997@gmail.com');
assert.equal(mail.subject, 'Cocina aceptó · #AB12 · Sucursal Centro');
assert.match(mail.text, /Cocina aceptó el pedido/);
assert.match(mail.text, /Ana López/);
assert.doesNotMatch(mail.text, /Venta hecha/);
assert.doesNotMatch(mail.text, /servicio@lasvaqueras/);

console.log('kitchen-notice tests: ok');
