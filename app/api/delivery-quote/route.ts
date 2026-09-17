import { NextResponse } from 'next/server';
import { isValidCoord } from '@/lib/delivery-address';
import { COPY } from '@/lib/iangel-copy';
import { metersFromStore } from '@/lib/iangel-geo';
import { assignmentFromRouting, quoteExpiresAt, signQuoteAssignment } from '@/lib/iangel-quote-token';
import { needsUberQuote, resolveDeliveryRouting } from '@/lib/iangel-routing';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const street = typeof body.street === 'string' ? body.street.trim() : '';
    const extNumber = typeof body.extNumber === 'string' ? body.extNumber.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone : '';
    const priceBaseTotal = Number(body.priceBaseTotal) || 0;

    if (!isValidCoord(lat, lng) || !street || !extNumber || !/^\d{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: 'Completa calle, número, CP y confirma el punto en el mapa para cotizar' },
        { status: 400 }
      );
    }

    const meters = Math.round(metersFromStore(lat, lng));
    const { riderActive, riderBusy } = await getRoutingRiderFlags();
    const routingInput = { meters, riderActive, riderBusy, priceBaseTotal };

    let uberQuoteId: string | null = null;
    let uberQuoteFee: number | null = null;
    if (needsUberQuote(routingInput)) {
      if (!isUberQuoteConfigured()) {
        return NextResponse.json(
          {
            error:
              'Falta el Client Secret real de Uber. En n8n solo se ve un placeholder. Cópialo en .env desde https://direct.uber.com (Developer).',
          },
          { status: 400 }
        );
      }
      const quote = await createDeliveryQuote({
        dropoffStreet: `${street} ${extNumber}`,
        dropoffZip: postalCode,
        dropoffLat: lat,
        dropoffLng: lng,
        dropoffPhone: phone,
      });
      uberQuoteId = quote.quoteId;
      uberQuoteFee = quote.fee;
    }

    const routing = resolveDeliveryRouting({ ...routingInput, uberQuoteFee });
    if (routing.blocked || !routing.defaultKind) {
      return NextResponse.json(
        { error: routing.blockedReason || COPY.inactive, routing, meters },
        { status: 400 }
      );
    }

    const option = routing.options.find((item) => item.kind === routing.defaultKind);
    if (!option) {
      return NextResponse.json({ error: 'No se pudo cotizar el envío' }, { status: 400 });
    }

    const assignment = assignmentFromRouting({
      lat,
      lng,
      meters,
      kind: routing.defaultKind,
      uberQuoteId,
      uberFee: option.uberFee,
      customerFee: option.customerFee,
    });
    const token = await signQuoteAssignment(assignment);

    return NextResponse.json({
      kind: routing.defaultKind,
      fee: option.customerFee,
      customerFee: option.customerFee,
      uberFee: option.uberFee,
      meters,
      waitNotice: routing.allowWait ? COPY.waitBody : null,
      routing,
      token,
      expiresAt: quoteExpiresAt(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
