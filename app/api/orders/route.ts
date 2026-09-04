import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem } from '@/types';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { DELIVERY_FEE } from '@/lib/pricing';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { getStripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentIntentId, customer, items, restaurantId } = body as {
      paymentIntentId: string;
      restaurantId?: string;
      customer: { name: string; phone: string; address: string; references?: string };
      items: CartItem[];
    };

    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'paymentIntentId inválido' }, { status: 400 });
    }
    if (!customer?.name || !customer?.phone || !customer?.address) {
      return NextResponse.json({ error: 'Faltan datos del cliente' }, { status: 400 });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `El pago no está completado (${paymentIntent.status})` },
        { status: 400 }
      );
    }

    const priceBaseTotal = Number(paymentIntent.metadata.price_base_total || 0);
    const deliveryFee = Number(paymentIntent.metadata.delivery_fee || DELIVERY_FEE);
    const split = calcCheckoutSplit({ priceBaseTotal, deliveryFee });

    const supabase = createAdminSupabase();
    const existing = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ order: mapDbOrder(existing.data as DbOrderRow) });
    }

    const insert = await supabase
      .from('orders')
      .insert({
        stripe_payment_intent_id: paymentIntentId,
        restaurant_id: restaurantId || null,
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        delivery_address: customer.address.trim(),
        delivery_references: customer.references?.trim() || null,
        total_charged: split.totalCharged,
        restaurant_payout: split.restaurantPayout,
        platform_fee: split.platformFee,
        customer_fee: split.customerFee,
        delivery_fee: split.deliveryFee,
        status: 'pending',
        items: items || [],
      })
      .select('*')
      .single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return NextResponse.json({ order: mapDbOrder(insert.data as DbOrderRow) });
  } catch (error) {
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'No se pudo guardar el pedido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
