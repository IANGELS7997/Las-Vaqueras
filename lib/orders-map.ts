import type { CartItem, Order, OrderStatus } from '@/types';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'preparing',
  'in_transit',
  'delivered',
  'cancelled',
];

export type DbOrderRow = {
  id: string;
  stripe_payment_intent_id: string;
  restaurant_id: string | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_references: string | null;
  total_charged: number | string;
  restaurant_payout: number | string;
  platform_fee: number | string;
  customer_fee: number | string;
  delivery_fee: number | string;
  status: OrderStatus;
  items: CartItem[] | null;
  created_at: string;
};

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

export function mapDbOrder(row: DbOrderRow): Order {
  return {
    id: row.id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    items: Array.isArray(row.items) ? row.items : [],
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      address: row.delivery_address,
      references: row.delivery_references || '',
    },
    paymentMethod: 'card',
    subtotal: toNumber(row.total_charged) - toNumber(row.customer_fee) - toNumber(row.delivery_fee),
    serviceFee: toNumber(row.customer_fee),
    deliveryFee: toNumber(row.delivery_fee),
    total: toNumber(row.total_charged),
    restaurantPayout: toNumber(row.restaurant_payout),
    platformFee: toNumber(row.platform_fee),
    status: row.status,
    createdAt: row.created_at,
    estimatedMinutes: 35,
  };
}

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
