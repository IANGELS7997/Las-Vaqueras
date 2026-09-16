import { kitchenTicketLabel } from '@/lib/iangel-labels';
import type { CartItem, DeliveryProvider, Order, OrderStatus } from '@/types';

export const ORDER_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'pending',
  'preparing',
  'in_transit',
  'delivered',
  'delivered_unclaimed',
  'cancelled',
];

export const KITCHEN_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'preparing',
  'in_transit',
  'delivered',
  'delivered_unclaimed',
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
  profile_login_token?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  rider_lat?: number | null;
  rider_lng?: number | null;
  delivery_provider?: string | null;
  cook_hold?: boolean | null;
  leave_at_door?: boolean | null;
  dispatch_status?: string | null;
  customer_phone_alt?: string | null;
  pickup_pin?: string | null;
  short_code?: string | null;
  eta_minutes?: number | null;
  gated_community?: boolean | null;
};

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value);
}

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapDbOrder(row: DbOrderRow): Order {
  const fulfillment = row.fulfillment_type === 'pickup' ? 'pickup' : 'delivery';
  const provider = (row.delivery_provider || (fulfillment === 'pickup' ? 'pickup' : 'uber')) as DeliveryProvider;
  const cookHold = Boolean(row.cook_hold);
  return {
    id: row.id,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    items: Array.isArray(row.items) ? row.items : [],
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      phoneAlt: row.customer_phone_alt || '',
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
    estimatedMinutes: row.eta_minutes || 35,
    fulfillment,
    pickupAt: row.pickup_at || null,
    cardFunding: row.card_funding || null,
    shortCode: row.short_code || null,
    pickupPin: row.pickup_pin || null,
    provider,
    cookHold,
    leaveAtDoor: Boolean(row.leave_at_door),
    dispatchStatus: row.dispatch_status || null,
    dropoffLat: toCoord(row.dropoff_lat),
    dropoffLng: toCoord(row.dropoff_lng),
    riderLat: toCoord(row.rider_lat),
    riderLng: toCoord(row.rider_lng),
    phoneAlt: row.customer_phone_alt || null,
    kitchenLabel: kitchenTicketLabel({ fulfillment, provider, cookHold }),
    etaMinutes: row.eta_minutes ?? null,
    gatedCommunity: Boolean(row.gated_community),
  };
}

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

export function canRefundCancel(row: {
  status: string;
  cook_hold?: boolean | null;
  dispatch_status?: string | null;
}): boolean {
  if (['preparing', 'in_transit', 'delivered', 'delivered_unclaimed'].includes(row.status)) return false;
  const dispatch = row.dispatch_status || '';
  if (['picked_up', 'en_route', 'arrived', 'waiting_customer', 'delivered', 'delivered_unclaimed'].includes(dispatch)) {
    return false;
  }
  return row.status === 'pending' || Boolean(row.cook_hold);
}
