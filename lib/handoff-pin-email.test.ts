import assert from 'node:assert/strict';
import type { PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { DEVELOPER_ORDER_COPY } from '@/lib/customer-mail';
import { buildHandoffPinEmail, handoffPinInternalCopy, isHandoffPin } from '@/lib/handoff-pin-email';

const row = {
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
} as unknown as PurchaseNoticeRow;

assert.equal(isHandoffPin('1234'), true);
assert.equal(isHandoffPin('123'), false);
assert.equal(isHandoffPin('12a4'), false);

const customer = buildHandoffPinEmail({
  customerName: row.customer_name,
  orderId: row.id,
  branchId: row.branch_id,
  pin: '4821',
});
assert.match(customer.subject, /Tu clave de entrega/);
assert.match(customer.text, /4821/);
assert.doesNotMatch(customer.text, /iangels7997/);

const kitchen = handoffPinInternalCopy(row, '4821', 'kitchen');
assert.equal(kitchen.to, DEVELOPER_ORDER_COPY);
assert.equal(kitchen.to, 'iangels7997@gmail.com');
assert.equal(kitchen.subject, 'CLAVE · #AB12');
assert.match(kitchen.text, /La cocina envió la clave de entrega/);
assert.match(kitchen.text, /Clave: 4821/);
assert.match(kitchen.text, /Ana López/);
assert.match(kitchen.html, /4821/);

const panel = handoffPinInternalCopy(row, '4821', 'panel');
assert.match(panel.text, /Pin a cliente/);
assert.doesNotMatch(panel.text, /La cocina envió/);

console.log('handoff-pin-email tests: ok');
