import { NextResponse } from 'next/server';
import { isValidCoord } from '@/lib/delivery-address';
import { COPY } from '@/lib/iangel-copy';
import { metersFromStore } from '@/lib/iangel-geo';
import { QUOTE_TTL_MS } from '@/lib/iangel-constants';
import { assignmentFromRouting, quoteExpiresAt, signQuoteAssignment } from '@/lib/iangel-quote-token';
import { resolveDeliveryRouting } from '@/lib/iangel-routing';
import { getRoutingRiderFlags } from '@/lib/iangel-state';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';
import { sendRiderPush } from '@/lib/push-vapid';

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
    const gatedCommunity = body.gatedCommunity === true;
    const priceBaseTotal = Number(body.priceBaseTotal || 0);

    if (!isValidCoord(lat, lng) || !street || !extNumber || !/^\d{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: 'Completa calle, número, CP y marca el punto en el mapa para cotizar' },
        { status: 400 }
      );
    }

    const meters = Math.round(metersFromStore(lat, lng));
    const { riderActive, riderBusy, pingStale } = await getRoutingRiderFlags();
    if (pingStale && riderActive) {
      void sendRiderPush({
        title: 'IANGEL',
        body: COPY.stillActivePush,
        tag: 'iangel-still-active',
      });
    }

    let uberQuote: { quoteId: string; fee: number; expiresAt: string | null } | null = null;
    const preview = resolveDeliveryRouting({
      meters,
      riderActive,
      riderBusy,
      gatedCommunity,
      priceBaseTotal: Number.isFinite(priceBaseTotal) ? priceBaseTotal : 0,
      uberQuoteFee: null,
    });

    const needsUberQuote = !preview.blocked && (preview.allowUber || preview.defaultKind === 'uber');
    if (needsUberQuote) {
      if (!isUberQuoteConfigured()) {
        return NextResponse.json(
          {
            error:
              'Falta el Client Secret real de Uber. En n8n solo se ve un placeholder. Cópialo en .env desde https://direct.uber.com (Developer).',
          },
          { status: 400 }
        );
      }
      uberQuote = await createDeliveryQuote({
        dropoffStreet: `${street} ${extNumber}`,
        dropoffZip: postalCode,
        dropoffLat: lat,
        dropoffLng: lng,
        dropoffPhone: phone,
      });
    }

    const routing = resolveDeliveryRouting({
      meters,
      riderActive,
      riderBusy,
      gatedCommunity,
      priceBaseTotal: Number.isFinite(priceBaseTotal) ? priceBaseTotal : 0,
      uberQuoteFee: uberQuote?.fee ?? null,
    });

    const expiresAt = quoteExpiresAt();
    const tokens: Record<string, string> = {};
    for (const option of routing.options) {
      tokens[option.kind] = await signQuoteAssignment(
        assignmentFromRouting({
          lat,
          lng,
          meters,
          kind: option.kind,
          uberQuoteId: option.kind === 'uber' ? uberQuote?.quoteId : null,
          uberFee: option.uberFee,
          customerFee: option.customerFee,
          gatedCommunity,
        })
      );
    }

    return NextResponse.json({
      meters,
      fee: routing.defaultKind
        ? routing.options.find((option) => option.kind === routing.defaultKind)?.customerFee ?? null
        : null,
      expiresAt,
      ttlMs: QUOTE_TTL_MS,
      quoteId: uberQuote?.quoteId || null,
      uberFee: uberQuote?.fee ?? null,
      routing,
      tokens,
      copy: COPY.quoteTtl,
      blocked: routing.blocked,
      blockedReason: routing.blockedReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
