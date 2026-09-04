import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { DELIVERY_FEE } from '@/lib/pricing';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceBaseTotal, stripeAccountId, customer } = body;
    const deliveryFee = isNonNegativeNumber(body.deliveryFee) ? body.deliveryFee : DELIVERY_FEE;
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

    if (!destination.startsWith('acct_')) {
      return NextResponse.json(
        {
          error:
            'Falta stripeAccountId. Pon STRIPE_CONNECT_ACCOUNT_ID (acct_... de test) en .env',
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
      transfer_data: {
        destination,
      },
      application_fee_amount: split.applicationFeeCentavos,
      metadata: {
        price_base_total: String(priceBaseTotal),
        delivery_fee: String(deliveryFee),
        restaurant_payout: String(split.restaurantPayout),
        platform_fee: String(split.platformFee),
        customer_name: customer?.name ? String(customer.name).slice(0, 200) : '',
        customer_phone: customer?.phone ? String(customer.phone).slice(0, 40) : '',
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
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
