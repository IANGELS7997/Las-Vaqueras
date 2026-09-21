/** IANGEL / Las Vaqueras delivery routing. Pin: lib/restaurant.ts */

export const SELF_MAX_M = 4000;
export const UBER_MIN_M = 4001;
export const UBER_MAX_M = 4500;
export const SELF_FEE_MXN = 50;
export const QUOTE_TTL_MS = 4 * 60 * 1000;
export const HEARTBEAT_STALE_MS = 12 * 60 * 1000;
export const SHIFT_START_SEC = 12 * 3600;
export const SHIFT_END_SEC = 21 * 3600;
export const SHIFT_WARN_HOUR = 20;
export const SHIFT_WARN_MINUTE = 50;
export const IANGEL_SLUG = 'las-vaqueras';

export const DISPATCH_ACTIVE_TRIP = [
  'assigned',
  'picked_up',
  'en_route',
  'arrived',
  'waiting_customer',
] as const;

export type DeliveryProvider = 'pickup' | 'self' | 'uber' | 'wait_self';
