import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem } from '@/types';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { fulfillmentDeliveryFee, isFulfillmentMode } from '@/lib/fulfillment';
import { isValidPickupAt } from '@/lib/pickup-slots';
import { formatDeliveryReferences, isValidCoord } from '@/lib/delivery-address';
import { getOpenStatus, RESTAURANT_INFO } from '@/lib/restaurant';
import { getStripe } from '@/lib/stripe';
import { createDeliveryQuote, isUberQuoteConfigured } from '@/lib/uber-direct';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceBaseTotal, stripeAccountId, customer, items, restaurantId, fulfillment, pickupAt } =
      body as {
        priceBaseTotal: number;
        stripeAccountId?: string;
        restaurantId?: string;
        fulfillment?: string;
        pickupAt?: string | null;
        customer?: {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          references?: string;
          lat?: number | null;
          lng?: number | null;
        };
        items?: CartItem[];
      };

    if (!getOpenStatus().isOpen) {
      return NextResponse.json({ error: 'El restaurante está cerrado' }, { status: 400 });
    }
    if (!isFulfillmentMode(fulfillment)) {
      return NextResponse.json({ error: 'Elige domicilio o recoger en tienda' }, { status: 400 });
    }

    let deliveryFee = fulfillmentDeliveryFee(fulfillment);
    const destination =
      (typeof stripeAccountId === 'string' && stripeAccountId.startsWith('acct_')
        ? stripeAccountId
        : process.env.STRIPE_CONNECT_ACCOUNT_ID) || '';

    if (!isPositiveNumber(priceBaseTotal)) {
      return NextResponse.json(
        { error: 'priceBaseTotal debe ser un número mayor a 0' },
        { status: 400 }
      );
    }

    const name = customer?.name?.trim() || '';
    const phone = customer?.phone?.trim() || '';
    const email = customer?.email?.trim().toLowerCase() || '';
    const isPickup = fulfillment === 'pickup';
    const address = isPickup ? RESTAURANT_INFO.address : customer?.address?.trim() || '';
    const lat = typeof customer?.lat === 'number' ? customer.lat : Number.NaN;
    const lng = typeof customer?.lng === 'number' ? customer.lng : Number.NaN;
    const references = isPickup
      ? ''
      : formatDeliveryReferences(customer?.references || '', Number.isFinite(lat) ? lat : null, Number.isFinite(lng) ? lng : null);
    const pickupAtIso = typeof pickupAt === 'string' ? pickupAt : '';

    if (!name || !phone || !email || (!isPickup && !address)) {
      return NextResponse.json(
        { error: isPickup ? 'Faltan nombre, teléfono o correo' : 'Faltan nombre, teléfono, correo o dirección' },
        { status: 400 }
      );
    }
    if (isPickup && !isValidPickupAt(pickupAtIso)) {
      return NextResponse.json(
        { error: 'Elige una hora de recoger válida (mínimo 30 minutos)' },
        { status: 400 }
      );
    }
    if (!isPickup && !isValidCoord(lat, lng)) {
      return NextResponse.json(
        { error: 'Marca el punto exacto de entrega en el mapa' },
        { status: 400 }
      );
    }
    if (!isPickup) {
      if (!isUberQuoteConfigured()) {
        return NextResponse.json(
          {
            error:
              'Falta el Client Secret real de Uber Direct. Cópialo desde https://direct.uber.com, no el placeholder de n8n.',
          },
          { status: 400 }
        );
      }
      const quote = await createDeliveryQuote({
        dropoffStreet: address.split(',')[0] || address,
        dropoffZip: /\b(\d{5})\b/.exec(address)?.[1] || '31210',
        dropoffLat: lat,
        dropoffLng: lng,
        dropoffPhone: phone,
      });
      deliveryFee = quote.fee;
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 });
    }

    if (!destination.startsWith('acct_')) {
      return NextResponse.json(
        {
          error:
            'Falta stripeAccountId. Pon STRIPE_CONNECT_ACCOUNT_ID (acct_...) en .env',
        },
        { status: 400 }
      );
    }

    const split = calcCheckoutSplit({ priceBaseTotal, deliveryFee });

    if (split.applicationFeeCentavos <= 0 || split.applicationFeeCentavos >= split.totalChargedCentavos) {
      return NextResponse.json(
        { error: 'El split de Connect dejó una application_fee inválida' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: split.totalChargedCentavos,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      receipt_email: email,
      transfer_data: {
        destination,
      },
      application_fee_amount: split.applicationFeeCentavos,
      metadata: {
        price_base_total: String(priceBaseTotal),
        delivery_fee: String(deliveryFee),
        restaurant_payout: String(split.restaurantPayout),
        platform_fee: String(split.platformFee),
        customer_name: name.slice(0, 200),
        customer_phone: phone.slice(0, 40),
        customer_email: email.slice(0, 200),
        fulfillment,
        pickup_at: isPickup ? pickupAtIso : '',
      },
    });

    const supabase = createAdminSupabase();
    const insert = await supabase
      .from('orders')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        restaurant_id: restaurantId || null,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        delivery_address: address,
        delivery_references: references || null,
        total_charged: split.totalCharged,
        restaurant_payout: split.restaurantPayout,
        platform_fee: split.platformFee,
        customer_fee: split.customerFee,
        delivery_fee: split.deliveryFee,
        fulfillment_type: fulfillment,
        pickup_at: isPickup ? pickupAtIso : null,
        status: 'awaiting_payment',
        items: items || [],
      })
      .select('id')
      .single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
      orderId: insert.data.id,
      split: {
        subtotalWeb: split.subtotalWeb,
        customerFee: split.customerFee,
        deliveryFee: split.deliveryFee,
        totalCharged: split.totalCharged,
        restaurantPayout: split.restaurantPayout,
        platformFee: split.platformFee,
      },
    });
  } catch (error) {
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'No se pudo crear el PaymentIntent';

    const status = error instanceof Stripe.errors.StripeError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
