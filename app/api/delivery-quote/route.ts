import { NextResponse } from 'next/server';
import { isValidCoord } from '@/lib/delivery-address';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    if (!isUberQuoteConfigured()) {
      return NextResponse.json(
        {
          error:
            'Falta el Client Secret real de Uber. En n8n solo se ve un placeholder. Cópialo en .env desde https://direct.uber.com (Developer).',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const street = typeof body.street === 'string' ? body.street.trim() : '';
    const extNumber = typeof body.extNumber === 'string' ? body.extNumber.trim() : '';
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone : '';

    if (!isValidCoord(lat, lng) || !street || !extNumber || !/^\d{5}$/.test(postalCode)) {
      return NextResponse.json(
        { error: 'Completa calle, número, CP y marca el punto en el mapa para cotizar' },
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

    return NextResponse.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo cotizar el envío';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
