import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import type { CartItem } from '@/types';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import { resolveStripeConnectDestination } from '@/lib/stripe-connect-destination';
import { countDeliveryPlatillos } from '@/lib/delivery-tarifa';
import { isFulfillmentMode } from '@/lib/fulfillment';
import { isValidPickupAt } from '@/lib/pickup-slots';
import { formatDeliveryReferences, isValidCoord } from '@/lib/delivery-address';
import { cookies } from 'next/headers';
import { CUSTOMER_COOKIE, customerCookieOptions, customerSessionToken, readCustomerIdFromRequest } from '@/lib/customer-auth';
import { addressKey, clientIp, foodDiscountPercentLabel, foodDiscountRate, loyaltyLabel, normalizeEmail, normalizePhone, quoteFoodDiscount, type LoyaltyKind } from '@/lib/loyalty';
import { findCustomerIdByPhone, resolveLoyaltyKind } from '@/lib/loyalty-guard';
import {
  getAvailableJumboReward,
  jumboGiftBase,
  JUMBO_REDEEM_COOKIE,
  readRedeemCookie,
  redeemJumboReward,
  reserveJumboReward,
  grantJumboReward,
} from '@/lib/loyalty-reward';
import { resolveGiftCart } from '@/lib/gift-cart';
import { calcCartBaseTotal } from '@/lib/pricing';
import { getOpenStatus, RESTAURANT_INFO } from '@/lib/restaurant';
import { getStripe } from '@/lib/stripe';
import { BAG_LIMIT_BODY, BAG_LIMIT_TITLE, bagFits, iangelCarries } from '@/lib/bag-capacity';
import { resolvePaidDelivery } from '@/lib/iangel-checkout';
import { cashAbuseMessage, cashIdentityMessage, type CashPriorOrder } from '@/lib/cash-fraud';
import { cashCheckoutAllowed, cashStoredAmounts } from '@/lib/iangel-cash';
import { paidOrderStatusFields } from '@/lib/order-auto-advance';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { alertIfKitchenOfflineForOrder } from '@/lib/kitchen-order-alert';
import { sendDeveloperPurchaseNotice } from '@/lib/developer-purchase-email';
import { sendCustomerTicket } from '@/lib/ticket-email';
import { notifyIangelNewOrder } from '@/lib/iangel-push';
import { notifyIangelOpsOrder, type IangelOpsRow } from '@/lib/iangel-ops';
import { openPendingForPhone, pendingAdjustment, settlePendingBalances } from '@/lib/rider-help-store';
import { namesFromCheckout } from '@/lib/customer-from-checkout';
import { upsertCustomer } from '@/lib/customers';
import { sendGiftOrderEmail } from '@/lib/gift-order-email';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function cashPriors(
  supabase: ReturnType<typeof createAdminSupabase>,
  phone: string
): Promise<CashPriorOrder[]> {
  const digits = normalizePhone(phone);
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const [openRows, recentRows] = await Promise.all([
    supabase
      .from('orders')
      .select('id, customer_phone, delivery_address, status, created_at')
      .eq('pay_method', 'cash')
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false })
      .limit(40),
    supabase
      .from('orders')
      .select('id, customer_phone, delivery_address, status, created_at')
      .eq('pay_method', 'cash')
      .gte('created_at', since)
      .ilike('customer_phone', `%${digits}%`)
      .limit(20),
  ]);
  if (openRows.error || recentRows.error) {
    throw new Error(openRows.error?.message || recentRows.error?.message || 'No se pudo revisar el efectivo');
  }
  const byId = new Map<string, CashPriorOrder>();
  for (const row of [...(openRows.data || []), ...(recentRows.data || [])]) {
    const id = String(row.id || '');
    if (!id || byId.has(id)) continue;
    byId.set(id, {
      phone: String(row.customer_phone || ''),
      address: String(row.delivery_address || ''),
      status: String(row.status || ''),
      createdAt: String(row.created_at || ''),
    });
  }
  return Array.from(byId.values());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { priceBaseTotal, stripeAccountId, customer, items, restaurantId, fulfillment, pickupAt, acceptFinalSale, payMethod: requestedPay, leaveAtDoor: requestedDoor } =
      body as {
        priceBaseTotal: number;
        stripeAccountId?: string;
        restaurantId?: string;
        fulfillment?: string;
        pickupAt?: string | null;
        acceptFinalSale?: boolean;
        payMethod?: string;
        leaveAtDoor?: boolean;
        customer?: {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
          references?: string;
          lat?: number | null;
          lng?: number | null;
          firstName?: string;
          lastName?: string;
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
    let uberQuoteId: string | null = null;
    let routedDeliveryFee: number | undefined;
    let deliveryProvider: 'pickup' | 'self' | 'uber' | 'wait_self' | 'managed' = isPickup ? 'pickup' : 'self';
    let dispatchStatus = isPickup ? 'pickup_store' : 'self_iangel';
    const destination = resolveStripeConnectDestination(
      typeof stripeAccountId === 'string' ? stripeAccountId : null,
      {
        live: process.env.STRIPE_CONNECT_ACCOUNT_ID_LIVE,
        fallback: process.env.STRIPE_CONNECT_ACCOUNT_ID,
      }
    );

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
        { error: 'Confirma el punto de entrega en el mapa' },
        { status: 400 }
      );
    }
    if (!isPickup) {
      const paid = await resolvePaidDelivery({
        lat,
        lng,
        street: address.split(',')[0] || address,
        zip: /\b(\d{5})\b/.exec(address)?.[1] || '31210',
        phone,
        priceBaseTotal,
      });
      deliveryProvider = paid.kind;
      dispatchStatus = paid.dispatchStatus;
      uberFee = paid.uberFee;
      uberQuoteId = paid.uberQuoteId;
      routedDeliveryFee = paid.customerFee;
      if (iangelCarries(paid.kind) && !bagFits(cartItems)) {
        return NextResponse.json(
          { error: `${BAG_LIMIT_TITLE}. ${BAG_LIMIT_BODY}` },
          { status: 400 }
        );
      }
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'El correo no es válido' }, { status: 400 });
    }

    if (!destination.startsWith('acct_')) {
      return NextResponse.json(
        {
          error:
            'Falta destination Connect válido. Usa STRIPE_CONNECT_ACCOUNT_ID_LIVE (dueño acct_…) o STRIPE_CONNECT_ACCOUNT_ID de test. No uses cuentas eliminadas.',
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
    const leaveAtDoor = !isPickup && requestedDoor === true;
    const pending = await openPendingForPhone(supabase, phone);
    const pendingMxn = pending.amountMxn;
    const pendingIds = pending.ids.join(',');
    const creditMxn = Math.min(0, Number(pending.creditMxn || 0));
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
    const rate = foodDiscountRate(loyaltyKind);
    const foodQuote =
      cartItems.length > 0
        ? quoteFoodDiscount(cartItems, rate, gift.active ? gift.giftLineUid : '')
        : quoteFoodDiscount(
            [{ uid: 'base', price_base: serverBase, quantity: 1 }],
            rate
          );
    if (foodQuote.fullWeb <= 0) {
      return NextResponse.json({ error: 'El carrito no tiene un subtotal válido' }, { status: 400 });
    }
    if (foodQuote.chargedWeb <= 0 && gift.variant !== 'shipping_only') {
      return NextResponse.json({ error: 'El carrito no tiene un subtotal válido' }, { status: 400 });
    }
    const waiveFood = gift.variant === 'shipping_only';
    const platilloCount = countDeliveryPlatillos(cartItems);
    const split = calcCheckoutSplit({
      priceBaseTotal: serverBase,
      fulfillment,
      platilloCount,
      provider: deliveryProvider,
      uberFee,
      deliveryFee: routedDeliveryFee,
      foodWebTotal: foodQuote.chargedWeb,
      foodDiscountPesos: foodQuote.discountPesos,
    });

    const payMethod = requestedPay === 'cash' ? 'cash' : 'card';

    if (payMethod === 'cash') {
      const allowed = cashCheckoutAllowed({
        provider: deliveryProvider,
        fulfillment,
        subtotalWeb: split.subtotalWeb,
      });
      if (!allowed.ok) {
        return NextResponse.json({ error: allowed.error }, { status: 400 });
      }
      if (canGiftJumbo) {
        return NextResponse.json({ error: 'Este cupón no se paga en efectivo' }, { status: 400 });
      }
      const firstName = customer?.firstName?.trim() || name.split(' ')[0] || '';
      const lastName = customer?.lastName?.trim() || name.split(' ').slice(1).join(' ') || '';
      const identity = cashIdentityMessage({ firstName, lastName, phone, email, address, fulfillment });
      if (identity) {
        return NextResponse.json({ error: identity }, { status: 400 });
      }
      let priors: CashPriorOrder[] = [];
      try {
        priors = await cashPriors(supabase, phone);
      } catch (err) {
        Sentry.captureException(err);
        return NextResponse.json({ error: 'No se pudo revisar el pago en efectivo. Intenta de nuevo.' }, { status: 400 });
      }
      const abuse = cashAbuseMessage({ phone, address, prior: priors });
      if (abuse) {
        return NextResponse.json({ error: abuse }, { status: 400 });
      }
      const amounts = cashStoredAmounts(split.subtotalWeb, fulfillment, routedDeliveryFee);
      const cashAdjust = pendingAdjustment(amounts.totalCharged, pending);
      const paidStatus = paidOrderStatusFields({ fulfillment, deliveryProvider });
      const profileLoginToken = crypto.randomUUID().replace(/-/g, '');
      const referencesText = canGiftJumbo
        ? [references, 'PROMOCIÓN · Papas Jumbo de regalo'].filter(Boolean).join(' · ')
        : references || null;
      const inserted = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurantId || null,
          customer_name: name,
          customer_phone: phone,
          customer_email: email,
          delivery_address: address,
          delivery_references: referencesText,
          total_charged: amounts.totalCharged + cashAdjust.extra,
          leave_at_door: leaveAtDoor,
          pending_balance_ids: cashAdjust.settleIds.join(',') || null,
          restaurant_payout: amounts.restaurantPayout,
          platform_fee: amounts.platformFee,
          customer_fee: 0,
          delivery_fee: amounts.deliveryFee,
          fulfillment_type: fulfillment,
          pickup_at: isPickup ? pickupAtIso : null,
          status: paidStatus.status,
          items: items || [],
          profile_login_token: profileLoginToken,
          loyalty_kind: canGiftJumbo ? 'jumbo_credit' : loyaltyKind,
          dropoff_lat: isPickup ? null : lat,
          dropoff_lng: isPickup ? null : lng,
          delivery_provider: deliveryProvider,
          dispatch_status: paidStatus.dispatch_status,
          pay_method: 'cash',
          cash_food_due: amounts.cashFoodDue,
          rider_paid_cash: false,
          kitchen_received_cash: false,
        })
        .select('*')
        .single();
      if (inserted.error || !inserted.data) {
        return NextResponse.json({ error: inserted.error?.message || 'No se pudo guardar el pedido' }, { status: 500 });
      }
      const orderRow = inserted.data as DbOrderRow;
      const names = namesFromCheckout({
        name,
        firstName: customer?.firstName,
        lastName: customer?.lastName,
      });
      const profile = await upsertCustomer(supabase, {
        firstName: names.firstName || name,
        lastName: names.lastName || name,
        phone,
        email,
      });
      if (orderRow.customer_id !== profile.id) {
        await supabase.from('orders').update({ customer_id: profile.id }).eq('id', orderRow.id);
      }
      const kind = (canGiftJumbo ? 'jumbo_credit' : loyaltyKind) as LoyaltyKind | null;
      const alreadyClaimed = await supabase
        .from('loyalty_claims')
        .select('id')
        .eq('order_id', orderRow.id)
        .maybeSingle();
      if (!alreadyClaimed.data && (kind === 'first_30' || kind === 'fifth_20' || kind === 'tenth_jumbo')) {
        await supabase.from('loyalty_claims').insert({
          kind,
          customer_id: profile.id,
          phone: normalizePhone(phone),
          email: normalizeEmail(email),
          ip: clientIp(req.headers),
          address_key: addressKey({ address }),
          order_id: orderRow.id,
        });
      }
      if (kind === 'tenth_jumbo') {
        await grantJumboReward(supabase, profile.id, orderRow.id);
      }
      if (canGiftJumbo && jumboReward) {
        const redeemed = await redeemJumboReward(supabase, jumboReward.id, profile.id, orderRow.id);
        if (redeemed) {
          await sendGiftOrderEmail({
            to: email,
            customerName: name,
            orderId: orderRow.id,
            token: profileLoginToken,
            fulfillment: 'delivery',
            pickupAt: null,
            totalCharged: amounts.totalCharged,
          });
        }
      }
      void alertIfKitchenOfflineForOrder(supabase, { id: orderRow.id, short_code: orderRow.short_code }).catch((err) => {
        Sentry.captureException(err);
      });
      void sendDeveloperPurchaseNotice(orderRow).catch((err) => Sentry.captureException(err));
      void sendCustomerTicket({ ...orderRow, profile_login_token: profileLoginToken }).catch((err) => {
        Sentry.captureException(err);
      });
      if (String(orderRow.dispatch_status || '') === 'self_iangel') {
        void notifyIangelNewOrder({ code: orderRow.short_code, customer: orderRow.customer_name }).catch((err) => {
          Sentry.captureException(err);
        });
        void notifyIangelOpsOrder(orderRow as DbOrderRow & IangelOpsRow).catch((err) => Sentry.captureException(err));
      }
      if (cashAdjust.settleIds.length > 0) await settlePendingBalances(supabase, cashAdjust.settleIds);
      const response = NextResponse.json({
        cash: true,
        order: mapDbOrder({ ...orderRow, customer_id: profile.id }),
        pending: pendingMxn > 0 ? { amountMxn: pendingMxn, label: pending.label } : null,
      });
      response.cookies.set(CUSTOMER_COOKIE, await customerSessionToken(profile.id), customerCookieOptions());
      return response;
    }

    if (split.totalChargedCentavos < 1) {
      return NextResponse.json({ error: 'No hay un cobro válido para este canje' }, { status: 400 });
    }
    if (
      !waiveFood &&
      split.restaurantPayoutCentavos > 0 &&
      (split.applicationFeeCentavos <= 0 || split.applicationFeeCentavos >= split.totalChargedCentavos)
    ) {
      return NextResponse.json(
        { error: 'El split de Connect dejó una application_fee inválida' },
        { status: 400 }
      );
    }

    const cardAdjust = pendingAdjustment(split.totalCharged, pending);
    const skipTransfer = waiveFood || split.restaurantPayoutCentavos <= 0;

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(0, split.totalChargedCentavos + cardAdjust.extra * 100),
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      ...(skipTransfer
        ? {}
        : {
            transfer_data: { destination },
            application_fee_amount: Math.max(0, split.applicationFeeCentavos + cardAdjust.extra * 100),
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
        food_web_full: String(foodQuote.fullWeb),
        food_web_charged: String(foodQuote.chargedWeb),
        food_discount_pesos: String(foodQuote.discountPesos),
        jumbo_reward_id: canGiftJumbo && jumboReward ? jumboReward.id : '',
        gift_shipping_only: waiveFood ? '1' : '',
        dropoff_lat: isPickup ? '' : String(lat),
        dropoff_lng: isPickup ? '' : String(lng),
        delivery_provider: deliveryProvider,
        uber_quote_id: uberQuoteId || '',
      },
    });

    if (canGiftJumbo && jumboReward) {
      await reserveJumboReward(supabase, jumboReward.id, existingCustomerId || '', paymentIntent.id);
    }

    const profileLoginToken = crypto.randomUUID().replace(/-/g, '');
    const insert = await supabase
      .from('orders')
      .insert({
        stripe_payment_intent_id: paymentIntent.id,
        restaurant_id: restaurantId || null,
        customer_name: name,
        customer_phone: phone,
        customer_email: email,
        delivery_address: address,
        delivery_references: canGiftJumbo
          ? [references, 'PROMOCIÓN · Papas Jumbo de regalo'].filter(Boolean).join(' · ')
          : references || null,
        total_charged: split.totalCharged + cardAdjust.extra,
        leave_at_door: leaveAtDoor,
        pending_balance_ids: cardAdjust.settleIds.join(',') || null,
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
        dispatch_status: dispatchStatus,
        pay_method: 'card',
        rider_paid_cash: false,
        kitchen_received_cash: false,
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
        totalCharged: split.totalCharged + pendingMxn,
        pendingMxn,
        pendingLabel: pending.label,
        restaurantPayout: split.restaurantPayout,
        platformFee: split.platformFee,
        foodFullWeb: split.foodFullWeb,
        foodDiscountPesos: split.foodDiscountPesos,
      },
      loyalty: loyaltyKind || canGiftJumbo || foodQuote.discountPesos > 0
        ? {
            kind: loyaltyKind || (canGiftJumbo ? 'jumbo_credit' : null),
            label: canGiftJumbo ? 'Papas Jumbo de regalo aplicadas' : loyaltyLabel(loyaltyKind),
            percentLabel: foodDiscountPercentLabel(loyaltyKind),
            foodFullWeb: foodQuote.fullWeb,
            foodCharged: foodQuote.chargedWeb,
            percentPesos: foodQuote.percentPesos,
            giftPesos: foodQuote.giftPesos,
            discountPesos: foodQuote.discountPesos,
          }
        : null,
    });
  } catch (error) {
    Sentry.captureException(error);
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
