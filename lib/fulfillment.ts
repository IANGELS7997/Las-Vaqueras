import { DELIVERY_FEE } from '@/lib/pricing';
import type { FulfillmentMode } from '@/types';

export const FULFILLMENT_STORAGE_KEY = 'lv_fulfillment';
export const BROWSE_MENU_STORAGE_KEY = 'lv_browse_menu';

export type { FulfillmentMode };

export function isFulfillmentMode(value: unknown): value is FulfillmentMode {
  return value === 'delivery' || value === 'pickup';
}

export function fulfillmentDeliveryFee(mode: FulfillmentMode): number {
  return mode === 'pickup' ? 0 : DELIVERY_FEE;
}

export function fulfillmentLabel(mode: FulfillmentMode): string {
  return mode === 'pickup' ? 'Recoger en tienda' : 'Entrega a domicilio';
}
