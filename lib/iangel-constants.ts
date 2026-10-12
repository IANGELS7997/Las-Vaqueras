/** IANGEL / Las Vaqueras delivery routing. Pin: lib/restaurant.ts */

/** Círculo en línea recta. 2900.0 m entra; 2900.1 m ya es el siguiente tramo. */
export const BAND_NEAR_MAX_M = 2900;
/** Mismo borde que iAngel en Centro: 4000.0 m entra, 4000.1 m ya es $55. */
export const BAND_MID_MAX_M = 4000;
export const SELF_MAX_M = BAND_MID_MAX_M;
export const UBER_MIN_M = 4001;
/** Aviso de hasta 1 hora. Hasta 4500 m el checkout dice 45 minutos. */
export const FAR_NOTICE_MIN_M = 4501;
export const SERVICE_MAX_M = 5000;
export const NEAR_STORE_FEE_MXN = 39;
export const MID_STORE_FEE_MXN = 49;
export const SELF_FEE_MXN = 50;
export const OUTER_FEE_MXN = 55;

/** Tarifa que cobra la sucursal. No aplica al envío de iAngel en $50. */
export function managedCircleFee(meters: number): number {
  const distance = Math.max(0, meters);
  if (distance <= BAND_NEAR_MAX_M) return NEAR_STORE_FEE_MXN;
  if (distance <= BAND_MID_MAX_M) return MID_STORE_FEE_MXN;
  return OUTER_FEE_MXN;
}
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

export type DeliveryProvider = 'pickup' | 'self' | 'uber' | 'wait_self' | 'managed';
