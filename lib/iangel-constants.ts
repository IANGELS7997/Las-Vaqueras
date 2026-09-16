/** IANGEL / Las Vaqueras delivery routing. Pin: lib/restaurant.ts */

export const MAX_DELIVERY_M = 5000;
export const SELF_MAX_M = 4000;
export const ARRIVE_RADIUS_M = 150;
/** Recogí only near the store pin. */
export const STORE_PICKUP_RADIUS_M = 200;
export const SELF_FEE_MXN = 50;
export const QUOTE_TTL_MS = 4 * 60 * 1000;
export const COOK_HOLD_MIN_MINUTES = 35;
export const COOK_HOLD_MAX_MINUTES = 45;
export const COOK_HOLD_DISPLAY_MINUTES = 40;
export const CUSTOMER_WAIT_MS = 10 * 60 * 1000;
export const CUSTOMER_WAIT_PAUSE_MS = 5 * 60 * 1000;
export const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Active rider without ping: do not auto-inactivate; remind after this. */
export const HEARTBEAT_STALE_MS = 12 * 60 * 1000;
export const SHIFT_START_SEC = 12 * 3600;
export const SHIFT_END_SEC = 21 * 3600;
export const SHIFT_WARN_HOUR = 20;
export const SHIFT_WARN_MINUTE = 50;
export const IANGEL_SLUG = 'las-vaqueras';
export const IANGEL_NAME = 'IANGEL';

export const DISPATCH_ACTIVE_TRIP = [
  'assigned',
  'picked_up',
  'en_route',
  'arrived',
  'waiting_customer',
] as const;

export type DispatchStatus =
  | 'awaiting_n8n'
  | 'self_iangel'
  | 'needs_n8n_uber'
  | 'pickup_store'
  | 'cook_hold'
  | 'assigned'
  | 'picked_up'
  | 'en_route'
  | 'arrived'
  | 'waiting_customer'
  | 'delivered'
  | 'delivered_unclaimed'
  | 'cancelled'
  | 'incident';

export type DeliveryProvider = 'pickup' | 'self' | 'uber' | 'wait_self';

export const IANGEL_ENV_NAMES = [
  'IANGEL_API_SECRET',
  'IANGEL_RIDER_PASSWORD',
  'IANGEL_APP_ORIGIN',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
] as const;
