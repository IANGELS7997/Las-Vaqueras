import type { CartItem, Order, OrderStatus } from '@/types';
import { customerStatusLabel as syncCustomerLabel } from '@/lib/order-lifecycle';

export const ORDER_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'pending',
  'preparing',
  'in_transit',
  'delivered',
  'cancelled',
];

export const KITCHEN_ORDER_STATUSES: OrderStatus[] = [
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
  customer_email: string | null;
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
  fulfillment_type?: string | null;
  pickup_at?: string | null;
  customer_id?: string | null;
  card_funding?: string | null;
  dispatch_status?: string | null;
  short_code?: string | null;
  pickup_pin?: string | null;
  cook_hold?: boolean | null;
  leave_at_door?: boolean | null;
  incident_type?: string | null;
  eta_minutes?: number | null;
  rider_lat?: number | null;
  rider_lng?: number | null;
  loyalty_kind?: string | null;
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
      email: row.customer_email || '',
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
    estimatedMinutes: row.eta_minutes && Number(row.eta_minutes) > 0 ? Number(row.eta_minutes) : 12,
    fulfillment: row.fulfillment_type === 'pickup' ? 'pickup' : 'delivery',
    pickupAt: row.pickup_at || null,
    cardFunding: row.card_funding || null,
    dispatchStatus: row.dispatch_status || null,
    shortCode: row.short_code || null,
    pickupPin: row.pickup_pin || null,
    cookHold: Boolean(row.cook_hold),
    leaveAtDoor: Boolean(row.leave_at_door),
    incidentType: row.incident_type || null,
    etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
    loyaltyKind: row.loyalty_kind || null,
  };
}

export function customerStatusLabel(status: string, dispatchStatus?: string | null) {
  return syncCustomerLabel(status, dispatchStatus);
}

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
