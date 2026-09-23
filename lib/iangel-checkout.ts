import { COPY } from '@/lib/iangel-copy';
import { metersFromStore } from '@/lib/iangel-geo';
import { needsUberQuote, resolveDeliveryRouting, type RoutingResult } from '@/lib/iangel-routing';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';
import type { DeliveryProvider } from '@/lib/iangel-constants';

export async function resolvePaidDelivery(input: {
  lat: number;
  lng: number;
  street: string;
  zip: string;
  phone: string;
  priceBaseTotal: number;
}): Promise<{
  meters: number;
  kind: Exclude<DeliveryProvider, 'pickup'>;
  customerFee: number;
  uberFee: number;
  uberQuoteId: string | null;
  dispatchStatus: string;
  routing: RoutingResult;
}> {
  const meters = Math.round(metersFromStore(input.lat, input.lng));
  const { riderActive, riderBusy, uberDirectEnabled } = await getRoutingRiderFlags();
  const routingInput = {
    meters,
    riderActive: riderActive === true,
    riderBusy: riderBusy === true,
    uberDirectEnabled: uberDirectEnabled === true,
    priceBaseTotal: input.priceBaseTotal,
  };

  let uberQuoteId: string | null = null;
  let uberQuoteFee: number | null = null;
  if (needsUberQuote(routingInput)) {
    if (!isUberQuoteConfigured()) {
      throw new Error(
        'Falta el Client Secret real de Uber Direct. Cópialo desde https://direct.uber.com, no el placeholder de n8n.'
      );
    }
    const quote = await createDeliveryQuote({
      dropoffStreet: input.street,
      dropoffZip: input.zip,
      dropoffLat: input.lat,
      dropoffLng: input.lng,
      dropoffPhone: input.phone,
    });
    uberQuoteId = quote.quoteId;
    uberQuoteFee = quote.fee;
  }

  const routing = resolveDeliveryRouting({ ...routingInput, uberQuoteFee });
  const option = routing.options.find((item) => item.kind === routing.defaultKind);
  if (routing.blocked || !routing.defaultKind || !option) {
    throw new Error(routing.blockedReason || COPY.inactive);
  }

  const dispatchStatus =
    routing.defaultKind === 'uber' ? 'needs_n8n_uber' : routing.defaultKind === 'wait_self' ? 'cook_hold' : 'self_iangel';

  return {
    meters,
    kind: routing.defaultKind,
    customerFee: option.customerFee,
    uberFee: option.uberFee,
    uberQuoteId,
    dispatchStatus,
    routing,
  };
}
