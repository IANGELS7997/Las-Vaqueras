import { SELF_FEE_MXN, type DeliveryProvider } from '@/lib/iangel-constants';
import { metersFromStore } from '@/lib/iangel-geo';
import { initialDispatchStatus } from '@/lib/iangel-n8n-contract';
import { readQuoteAssignment } from '@/lib/iangel-quote-token';
import { assertProviderAllowed, resolveDeliveryRouting } from '@/lib/iangel-routing';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';

export async function resolvePaidDelivery(input: {
  lat: number;
  lng: number;
  address: string;
  phone: string;
  priceBaseTotal: number;
  provider: DeliveryProvider;
  quoteToken?: string;
  gatedCommunity?: boolean;
}): Promise<{
  provider: DeliveryProvider;
  meters: number;
  uberFee: number;
  uberQuoteId: string | null;
  quoteExpiresAt: string | null;
  cookHold: boolean;
  dispatchStatus: ReturnType<typeof initialDispatchStatus>;
  selfFee: number | null;
}> {
  const meters = Math.round(metersFromStore(input.lat, input.lng));
  const assignment = await readQuoteAssignment(input.quoteToken);
  if (!assignment || assignment.kind !== input.provider) {
    throw new Error('La cotización caducó (4 minutos). Vuelve a cotizar el envío.');
  }
  if (Math.abs(assignment.lat - input.lat) > 0.0002 || Math.abs(assignment.lng - input.lng) > 0.0002) {
    throw new Error('La ubicación cambió. Vuelve a cotizar el envío.');
  }

  const { riderActive, riderBusy } = await getRoutingRiderFlags();
  let uberFee = 0;
  let uberQuoteId: string | null = null;
  let quoteExpiresAt: string | null = assignment.exp ? new Date(assignment.exp).toISOString() : null;

  if (input.provider === 'uber') {
    if (!isUberQuoteConfigured()) {
      throw new Error('Falta el Client Secret real de Uber Direct.');
    }
    const quote = await createDeliveryQuote({
      dropoffStreet: input.address.split(',')[0] || input.address,
      dropoffZip: /\b(\d{5})\b/.exec(input.address)?.[1] || '31210',
      dropoffLat: input.lat,
      dropoffLng: input.lng,
      dropoffPhone: input.phone,
    });
    uberFee = quote.fee;
    uberQuoteId = quote.quoteId;
    quoteExpiresAt = quote.expiresAt;
  }

  const routing = resolveDeliveryRouting({
    meters,
    riderActive,
    riderBusy,
    gatedCommunity: input.gatedCommunity || assignment.gatedCommunity,
    priceBaseTotal: input.priceBaseTotal,
    uberQuoteFee: input.provider === 'uber' ? uberFee : assignment.uberFee || null,
  });
  if (routing.blocked) {
    throw new Error(routing.blockedReason || 'Esta dirección no admite envío.');
  }
  if (!assertProviderAllowed(routing, input.provider)) {
    throw new Error('Esa opción de envío ya no está disponible. Vuelve a cotizar.');
  }

  const cookHold = input.provider === 'wait_self';
  return {
    provider: input.provider,
    meters,
    uberFee,
    uberQuoteId,
    quoteExpiresAt,
    cookHold,
    dispatchStatus: initialDispatchStatus(input.provider),
    selfFee: input.provider === 'self' || input.provider === 'wait_self' ? SELF_FEE_MXN : null,
  };
}
