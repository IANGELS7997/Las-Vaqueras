import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import type { CartItem } from '@/types';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { countDeliveryPlatillos } from '@/lib/delivery-tarifa';
import { isFulfillmentMode } from '@/lib/fulfillment';
import { isValidPickupAt } from '@/lib/pickup-slots';
import { formatDeliveryReferences, isValidCoord } from '@/lib/delivery-address';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { cookies } from 'next/headers';
import { clientIp, discountedFoodBase, loyaltyLabel, normalizePhone } from '@/lib/loyalty';
import { findCustomerIdByPhone, resolveLoyaltyKind } from '@/lib/loyalty-guard';
import {
  getAvailableJumboReward,
  jumboGiftBase,
  JUMBO_REDEEM_COOKIE,
  readRedeemCookie,
  reserveJumboReward,
} from '@/lib/loyalty-reward';
import { resolveGiftCart } from '@/lib/gift-cart';
import { calcCartBaseTotal } from '@/lib/pricing';
import { SELF_FEE_MXN, type DeliveryProvider } from '@/lib/iangel-constants';
import { resolvePaidDelivery } from '@/lib/iangel-checkout';
import { randomPin, randomShortCode } from '@/lib/iangel-state';
import { getOpenStatus, RESTAURANT_INFO } from '@/lib/restaurant';
import { getStripe } from '@/lib/stripe';
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
    const {
      priceBaseTotal,
      stripeAccountId,
      customer,
      items,
      restaurantId,
      fulfillment,
      pickupAt,
      acceptFinalSale,
      provider: providerInput,
      quoteToken,
      leaveAtDoor,
      gatedCommunity,
    } = body as {
      priceBaseTotal: number;
      stripeAccountId?: string;
      restaurantId?: string;
      fulfillment?: string;
      pickupAt?: string | null;
      acceptFinalSale?: boolean;
      provider?: DeliveryProvider;
      quoteToken?: string;
      leaveAtDoor?: boolean;
      gatedCommunity?: boolean;
      customer?: {
        name?: string;
        phone?: string;
        phoneAlt?: string;
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
    if (acceptFinalSale !== true) {
      return NextResponse.json(
        { error: 'Confirma que el pedido es venta final para continuar' },
        { status: 400 }
      );
    }

    const cartItems = Array.isArray(items) ? items : [];
    const isPickup = fulfillment === 'pickup';
    let uberFee = 0;
    let paidDelivery: Awaited<ReturnType<typeof resolvePaidDelivery>> | null = null;
    const leaveDoor = leaveAtDoor === true;
    const gated = gatedCommunity === true;
    const phoneAlt = customer?.phoneAlt?.trim() || '';
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
    const requestedProvider: DeliveryProvider = isPickup
      ? 'pickup'
      : providerInput === 'self' || providerInput === 'wait_self' || providerInput === 'uber'
        ? providerInput
        : 'uber';
    if (!isPickup) {
      try {
        paidDelivery = await resolvePaidDelivery({
          lat,
          lng,
          address,
          phone,
          priceBaseTotal,
          provider: requestedProvider,
          quoteToken,
          gatedCommunity: gated,
        });
        uberFee = paidDelivery.uberFee;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo validar el envío';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 });
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

    const serverBase = cartItems.length > 0 ? calcCartBaseTotal(cartItems) : priceBaseTotal;
    if (!isPositiveNumber(serverBase)) {
      return NextResponse.json(
        { error: 'El carrito no tiene un subtotal válido' },
        { status: 400 }
      );
    }
    const supabase = createAdminSupabase();
    const cookieCustomerId = await readCustomerIdFromRequest();
    const existingCustomerId = (await findCustomerIdByPhone(supabase, phone)) || cookieCustomerId;
    const loyaltyKind = await resolveLoyaltyKind({
      supabase,
      customerId: existingCustomerId,
      phone,
      email,
      ip: clientIp(req.headers),
      street: customer?.address,
      address: address,
      isPickup,
      cookieCustomerId,
    });
    let foodBase = discountedFoodBase(serverBase, loyaltyKind);
    const jumboReward = existingCustomerId
      ? await getAvailableJumboReward(supabase, existingCustomerId)
      : null;
    const owner = existingCustomerId
      ? await supabase.from('customers').select('id, phone').eq('id', existingCustomerId).maybeSingle()
      : { data: null };
    const phoneMatchesOwner =
      Boolean(owner.data?.phone) && normalizePhone(String(owner.data?.phone)) === normalizePhone(phone);
    const redeemCookieId = existingCustomerId
      ? await readRedeemCookie(cookies().get(JUMBO_REDEEM_COOKIE)?.value, existingCustomerId)
      : null;
    const giftBase = jumboGiftBase(cartItems);
    const canGiftJumbo = Boolean(
      jumboReward && phoneMatchesOwner && giftBase > 0 && (!redeemCookieId || redeemCookieId === jumboReward.id)
    );
    if (canGiftJumbo) {
      foodBase = Math.round(Math.max(0, serverBase - giftBase) * 100) / 100;
    }
    if (!isPositiveNumber(foodBase) && !(canGiftJumbo && giftBase > 0)) {
      return NextResponse.json({ error: 'El carrito no tiene un subtotal válido' }, { status: 400 });
    }
    const gift = resolveGiftCart({
      flagged: canGiftJumbo,
      items: cartItems,
      fulfillment,
    });
    if (gift.variant === 'free_pickup') {
      return NextResponse.json(
        { error: 'Este cupón de recoger se confirma sin pago' },
        { status: 400 }
      );
    }
    const waiveFood = gift.variant === 'shipping_only';
    const chargeBase = foodBase > 0 ? foodBase : waiveFood ? 0 : 0.01;
    const platilloCount = countDeliveryPlatillos(cartItems);
    const deliveryProvider: DeliveryProvider = isPickup ? 'pickup' : paidDelivery?.provider || requestedProvider;
    const split = calcCheckoutSplit({
      priceBaseTotal: serverBase,
      fulfillment,
      platilloCount,
      uberFee,
      provider: deliveryProvider,
      giftFoodCredit: canGiftJumbo ? giftBase : 0,
    });

    if (split.totalChargedCentavos < 1) {
      return NextResponse.json({ error: 'No hay un cobro válido para este canje' }, { status: 400 });
    }
    if (
      !waiveFood &&
      (split.applicationFeeCentavos <= 0 || split.applicationFeeCentavos >= split.totalChargedCentavos)
    ) {
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
      ...(waiveFood
        ? {}
        : {
            transfer_data: { destination },
            application_fee_amount: split.applicationFeeCentavos,
          }),
      metadata: {
        price_base_total: String(serverBase),
        uber_fee: String(split.uberFee),
        domicile_tarifa: String(split.domicileTarifa),
        delivery_subsidy: String(split.deliverySubsidy),
        platillo_count: String(platilloCount),
        delivery_fee: String(split.deliveryFee),
        restaurant_payout: String(split.restaurantPayout),
        platform_fee: String(split.platformFee),
        stripe_fee: String(split.stripeFee),
        stripe_share: String(split.stripeShare),
        customer_name: name.slice(0, 200),
        customer_phone: phone.slice(0, 40),
        customer_email: email.slice(0, 200),
        fulfillment,
        pickup_at: isPickup ? pickupAtIso : '',
        loyalty_kind: canGiftJumbo ? 'jumbo_credit' : loyaltyKind || '',
        food_base_original: String(serverBase),
        food_base_charged: String(chargeBase),
        jumbo_reward_id: canGiftJumbo && jumboReward ? jumboReward.id : '',
        gift_shipping_only: waiveFood ? '1' : '',
        delivery_provider: deliveryProvider,
        dispatch_status: paidDelivery?.dispatchStatus || (isPickup ? 'pickup_store' : 'awaiting_n8n'),
        dropoff_lat: isPickup ? '' : String(lat),
        dropoff_lng: isPickup ? '' : String(lng),
        customer_phone_alt: phoneAlt.slice(0, 40),
        leave_at_door: leaveDoor ? '1' : '',
        cook_hold: paidDelivery?.cookHold ? '1' : '',
        uber_quote_id: paidDelivery?.uberQuoteId || '',
        gated_community: gated ? '1' : '',
      },
    });

    if (canGiftJumbo && jumboReward) {
      await reserveJumboReward(supabase, jumboReward.id, existingCustomerId || '', paymentIntent.id);
    }

    const profileLoginToken = crypto.randomUUID().replace(/-/g, '');
    const shortCode = randomShortCode();
    const pickupPin = randomPin();
    const n8nPayload = {
      provider: deliveryProvider,
      dispatch_status: paidDelivery?.dispatchStatus || (isPickup ? 'pickup_store' : 'awaiting_n8n'),
      uber_quote_id: paidDelivery?.uberQuoteId || null,
      uber_quote_fee: paidDelivery?.uberFee ?? null,
      dropoff_lat: isPickup ? null : lat,
      dropoff_lng: isPickup ? null : lng,
      customer_phone: phone,
      customer_phone_alt: phoneAlt || null,
      leave_at_door: leaveDoor,
      cook_hold: Boolean(paidDelivery?.cookHold),
      items: items || [],
    };
    const insert = await supabase
      .from('orders')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        restaurant_id: restaurantId || null,
        customer_name: name,
        customer_phone: phone,
        customer_phone_alt: phoneAlt || null,
        customer_email: email,
        delivery_address: address,
        delivery_references: canGiftJumbo
          ? [references, 'PROMOCIÓN · Papas Jumbo de regalo'].filter(Boolean).join(' · ')
          : references || null,
        total_charged: split.totalCharged,
        restaurant_payout: split.restaurantPayout,
        platform_fee: split.platformFee,
        customer_fee: split.customerFee,
        delivery_fee: split.deliveryFee,
        fulfillment_type: fulfillment,
        pickup_at: isPickup ? pickupAtIso : null,
        status: 'awaiting_payment',
        items: items || [],
        profile_login_token: profileLoginToken,
        loyalty_kind: canGiftJumbo ? 'jumbo_credit' : loyaltyKind,
        dropoff_lat: isPickup ? null : lat,
        dropoff_lng: isPickup ? null : lng,
        delivery_provider: deliveryProvider,
        uber_quote_id: paidDelivery?.uberQuoteId || null,
        uber_quote_fee: paidDelivery?.uberFee ?? null,
        quote_expires_at: paidDelivery?.quoteExpiresAt || null,
        self_fee: paidDelivery?.selfFee ?? (deliveryProvider === 'self' || deliveryProvider === 'wait_self' ? SELF_FEE_MXN : null),
        cook_hold: Boolean(paidDelivery?.cookHold),
        leave_at_door: leaveDoor,
        dispatch_status: n8nPayload.dispatch_status,
        pickup_pin: pickupPin,
        short_code: shortCode,
        gated_community: gated,
        n8n_payload: n8nPayload,
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
        domicileTarifa: split.domicileTarifa,
        customerFee: split.customerFee,
        uberFee: split.uberFee,
        deliveryDiscount: split.deliveryDiscount,
        deliveryFee: split.deliveryFee,
        totalCharged: split.totalCharged,
        restaurantPayout: split.restaurantPayout,
        platformFee: split.platformFee,
      },
      loyalty: loyaltyKind || canGiftJumbo
        ? {
            kind: loyaltyKind || 'tenth_jumbo',
            label: canGiftJumbo ? 'Papas Jumbo de regalo aplicadas' : loyaltyLabel(loyaltyKind),
            foodOriginal: serverBase,
            foodCharged: chargeBase,
          }
        : null,
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
