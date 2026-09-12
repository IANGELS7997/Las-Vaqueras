import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem } from '@/types';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { countDeliveryPlatillos } from '@/lib/delivery-tarifa';
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  customerSessionToken,
} from '@/lib/customer-auth';
import { namesFromCheckout } from '@/lib/customer-from-checkout';
import { fullCustomerName } from '@/lib/customer-identity';
import { upsertCustomer } from '@/lib/customers';
import { isFulfillmentMode } from '@/lib/fulfillment';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import { cardFingerprintFromPaymentIntent, cardFundingFromPaymentIntent } from '@/lib/card-funding';
import { addressKey, clientIp, normalizeEmail, normalizePhone, type LoyaltyKind } from '@/lib/loyalty';
import { sendGiftOrderEmail } from '@/lib/gift-order-email';
import { grantJumboReward, redeemJumboReward } from '@/lib/loyalty-reward';
import { getStripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function orderResponseWithProfile(args: {
  orderRow: DbOrderRow;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  supabase: ReturnType<typeof createAdminSupabase>;
  cardFingerprint?: string | null;
  ip?: string;
  loyaltyKind?: LoyaltyKind | null;
  jumboRewardId?: string | null;
  paymentIntentId?: string;
}) {
  const profile = await upsertCustomer(args.supabase, {
    firstName: args.firstName,
    lastName: args.lastName,
    phone: args.phone,
    email: args.email,
  });
  if (!args.orderRow.customer_id || args.orderRow.customer_id !== profile.id) {
    await args.supabase.from('orders').update({ customer_id: profile.id }).eq('id', args.orderRow.id);
  }
  const kind = args.loyaltyKind;
  const alreadyClaimed = await args.supabase
    .from('loyalty_claims')
    .select('id')
    .eq('order_id', args.orderRow.id)
    .maybeSingle();
  if (
    !alreadyClaimed.data &&
    (kind === 'first_30' || kind === 'fifth_20' || kind === 'tenth_jumbo')
  ) {
    await args.supabase.from('loyalty_claims').insert({
      kind,
      customer_id: profile.id,
      phone: normalizePhone(args.phone),
      email: normalizeEmail(args.email),
      card_fingerprint: args.cardFingerprint || null,
      ip: args.ip || null,
      address_key: addressKey({ address: args.orderRow.delivery_address }),
      order_id: args.orderRow.id,
    });
  }
  if (kind === 'tenth_jumbo') {
    await grantJumboReward(args.supabase, profile.id, args.orderRow.id);
  }
  const jumboRewardId = args.jumboRewardId;
  if (jumboRewardId) {
    await redeemJumboReward(
      args.supabase,
      jumboRewardId,
      profile.id,
      args.orderRow.id,
      args.paymentIntentId
    );
    const token =
      'profile_login_token' in args.orderRow
        ? String((args.orderRow as DbOrderRow & { profile_login_token?: string }).profile_login_token || '')
        : '';
    await sendGiftOrderEmail({
      to: args.email,
      customerName: args.orderRow.customer_name,
      orderId: args.orderRow.id,
      token,
      fulfillment: args.orderRow.fulfillment_type === 'pickup' ? 'pickup' : 'delivery',
      pickupAt: args.orderRow.pickup_at,
      totalCharged: Number(args.orderRow.total_charged || 0),
    });
  }
  const response = NextResponse.json({
    order: mapDbOrder({ ...args.orderRow, customer_id: profile.id }),
  });
  response.cookies.set(
    CUSTOMER_COOKIE,
    await customerSessionToken(profile.id),
    customerCookieOptions()
  );
  return response;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentIntentId, customer, items, restaurantId } = body as {
      paymentIntentId: string;
      restaurantId?: string;
      customer: {
        name?: string;
        firstName?: string;
        lastName?: string;
        phone: string;
        email: string;
        address: string;
        references?: string;
      };
      items: CartItem[];
    };

    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'paymentIntentId inválido' }, { status: 400 });
    }
    const { firstName, lastName } = namesFromCheckout(customer);
    const customerName = fullCustomerName(firstName, lastName) || customer.name?.trim() || '';
    if (!customerName || !customer?.phone || !customer?.address || !customer?.email) {
      return NextResponse.json({ error: 'Faltan datos del cliente' }, { status: 400 });
    }
    if (!isValidEmail(customer.email)) {
      return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 });
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    const cardFunding = cardFundingFromPaymentIntent(paymentIntent);
    const cardFingerprint = cardFingerprintFromPaymentIntent(paymentIntent);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `El pago no está completado (${paymentIntent.status})` },
        { status: 400 }
      );
    }

    const priceBaseTotal = Number(paymentIntent.metadata.price_base_total || 0);
    const fulfillment = isFulfillmentMode(paymentIntent.metadata.fulfillment)
      ? paymentIntent.metadata.fulfillment
      : 'delivery';
    const platilloCount = Number.isFinite(Number(paymentIntent.metadata.platillo_count))
      ? Number(paymentIntent.metadata.platillo_count)
      : countDeliveryPlatillos(items || []);
    const uberFee = Number(
      paymentIntent.metadata.uber_fee ||
        (fulfillment === 'pickup' ? 0 : paymentIntent.metadata.delivery_fee) ||
        0
    );
    const pickupAt = paymentIntent.metadata.pickup_at || null;
    const split = calcCheckoutSplit({
      priceBaseTotal,
      fulfillment,
      platilloCount,
      uberFee,
    });
    const email = customer.email.trim().toLowerCase();
    const address =
      fulfillment === 'pickup' ? RESTAURANT_INFO.address : customer.address.trim();
    const references = fulfillment === 'pickup' ? null : customer.references?.trim() || null;

    const supabase = createAdminSupabase();
    const existing = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existing.data) {
      const row = existing.data as DbOrderRow;
      if (row.status !== 'awaiting_payment') {
        return orderResponseWithProfile({
          orderRow: row,
          firstName,
          lastName,
          phone: customer.phone,
          email,
          supabase,
        });
      }

      const updated = await supabase
        .from('orders')
        .update({
          customer_name: customerName,
          customer_phone: customer.phone.trim(),
          customer_email: email,
          delivery_address: address,
          delivery_references: references,
          fulfillment_type: fulfillment,
          pickup_at: fulfillment === 'pickup' ? pickupAt : null,
          items: items || row.items || [],
          status: 'pending',
          card_funding: cardFunding,
          card_fingerprint: cardFingerprint,
        })
        .eq('id', row.id)
        .select('*')
        .single();

      if (updated.error) {
        return NextResponse.json({ error: updated.error.message }, { status: 500 });
      }

      return orderResponseWithProfile({
        orderRow: updated.data as DbOrderRow,
        firstName,
        lastName,
        phone: customer.phone,
        email,
        supabase,
        cardFingerprint,
        ip: clientIp(req.headers),
        loyaltyKind: (paymentIntent.metadata.loyalty_kind || null) as LoyaltyKind | null,
        jumboRewardId: paymentIntent.metadata.jumbo_reward_id || null,
        paymentIntentId,
      });
    }

    const insert = await supabase
      .from('orders')
      .insert({
        stripe_payment_intent_id: paymentIntentId,
        restaurant_id: restaurantId || null,
        customer_name: customerName,
        customer_phone: customer.phone.trim(),
        customer_email: email,
        delivery_address: address,
        delivery_references: references,
        total_charged: split.totalCharged,
        restaurant_payout: split.restaurantPayout,
        platform_fee: split.platformFee,
        customer_fee: split.customerFee,
        delivery_fee: split.deliveryFee,
        fulfillment_type: fulfillment,
        pickup_at: fulfillment === 'pickup' ? pickupAt : null,
        status: 'pending',
        items: items || [],
        card_funding: cardFunding,
        card_fingerprint: cardFingerprint,
      })
      .select('*')
      .single();

    if (insert.error) {
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }

    return orderResponseWithProfile({
      orderRow: insert.data as DbOrderRow,
      firstName,
      lastName,
      phone: customer.phone,
      email,
      supabase,
      cardFingerprint,
      ip: clientIp(req.headers),
      loyaltyKind: (paymentIntent.metadata.loyalty_kind || null) as LoyaltyKind | null,
      jumboRewardId: paymentIntent.metadata.jumbo_reward_id || null,
      paymentIntentId,
    });
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
