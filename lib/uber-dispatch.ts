import type { CartItem } from '@/types';
import { createDelivery, createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';

export const UBER_DISPATCHED = 'uber_dispatched';
export const UBER_NEEDS_RETRY = 'needs_n8n_uber';

function zipFromAddress(address: string) {
  const match = /\b(\d{5})\b/.exec(address);
  return match?.[1] || '31210';
}

function streetFromAddress(address: string) {
  return (address.split(',')[0] || address).trim();
}

function manifestFromItems(items: CartItem[]) {
  if (!items.length) {
    return [{ name: 'Pedido Las Vaqueras', quantity: 1, size: 'medium' as const }];
  }
  return items.map((item) => ({
    name: item.name,
    quantity: Math.max(1, item.quantity),
    size: 'medium' as const,
  }));
}

export type UberDispatchPatch = {
  uber_delivery_id?: string;
  uber_status?: string | null;
  uber_tracking_url?: string | null;
  dispatch_status: string;
};

/** Solo domicilio Uber. Recoger e IANGEL no piden courier. */
export async function dispatchUberDirectAfterPayment(input: {
  orderId: string;
  fulfillment: string;
  provider: string | null | undefined;
  alreadyDeliveryId?: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  customerName: string;
  notes?: string | null;
  items: CartItem[];
}): Promise<UberDispatchPatch | null> {
  if (input.fulfillment === 'pickup') return null;
  if (input.provider !== 'uber') return null;
  if (input.alreadyDeliveryId) return null;
  if (!isUberQuoteConfigured()) {
    return { dispatch_status: UBER_NEEDS_RETRY };
  }
  if (
    input.lat == null ||
    input.lng == null ||
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng)
  ) {
    return { dispatch_status: UBER_NEEDS_RETRY };
  }

  try {
    const quote = await createDeliveryQuote({
      dropoffStreet: streetFromAddress(input.address),
      dropoffZip: zipFromAddress(input.address),
      dropoffLat: input.lat,
      dropoffLng: input.lng,
      dropoffPhone: input.phone,
    });
    const delivery = await createDelivery({
      quoteId: quote.quoteId,
      dropoffStreet: streetFromAddress(input.address),
      dropoffZip: zipFromAddress(input.address),
      dropoffLat: input.lat,
      dropoffLng: input.lng,
      dropoffName: input.customerName,
      dropoffPhone: input.phone,
      dropoffNotes: input.notes || undefined,
      externalId: input.orderId,
      manifestItems: manifestFromItems(input.items),
    });
    return {
      uber_delivery_id: delivery.deliveryId,
      uber_status: delivery.status,
      uber_tracking_url: delivery.trackingUrl,
      dispatch_status: UBER_DISPATCHED,
    };
  } catch {
    return { dispatch_status: UBER_NEEDS_RETRY };
  }
}
