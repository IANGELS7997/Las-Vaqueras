import type { DeliveryProvider, DispatchStatus } from '@/lib/iangel-constants';

/**
 * D8 contract for n8n workflow SKVvYOhKSnPj1ggY.
 * Next.js never calls Uber Direct createDelivery.
 * n8n Create Uber Direct stays disabled until the owner says to activate.
 */
export const N8N_WORKFLOW_ID = 'SKVvYOhKSnPj1ggY';
export const N8N_CREATE_DELIVERY_NODE = 'Create Uber Direct Delivery';

export type N8nDispatchPayload = {
  order_id: string;
  short_code: string;
  provider: DeliveryProvider;
  dispatch_status: DispatchStatus;
  uber_quote_id: string | null;
  uber_quote_fee: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  customer_phone: string;
  customer_phone_alt: string | null;
  items: unknown;
  leave_at_door: boolean;
  cook_hold: boolean;
};

export function n8nShouldCreateUberDirect(provider: DeliveryProvider): boolean {
  return provider === 'uber';
}

export function initialDispatchStatus(provider: DeliveryProvider): DispatchStatus {
  if (provider === 'pickup') return 'pickup_store';
  if (provider === 'self') return 'self_iangel';
  if (provider === 'wait_self') return 'cook_hold';
  return 'awaiting_n8n';
}

export function n8nFutureBranch(provider: DeliveryProvider): 'create_direct' | 'skip' {
  return n8nShouldCreateUberDirect(provider) ? 'create_direct' : 'skip';
}
