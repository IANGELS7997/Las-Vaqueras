import { NextResponse } from 'next/server';
import type { CartItem } from '@/types';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { sendGiftOrderEmail } from '@/lib/gift-order-email';
import { isFulfillmentMode } from '@/lib/fulfillment';
import { resolveGiftCart } from '@/lib/gift-cart';
import { normalizePhone } from '@/lib/loyalty';
import {
  getAvailableJumboReward,
  redeemJumboReward,
} from '@/lib/loyalty-reward';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { isValidPickupAt } from '@/lib/pickup-slots';
import { getOpenStatus, RESTAURANT_INFO } from '@/lib/restaurant';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) {
    return NextResponse.json({ error: 'Entra a tu perfil para canjear' }, { status: 401 });
  }

  if (!getOpenStatus().isOpen) {
    return NextResponse.json({ error: 'El restaurante está cerrado' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
  const fulfillment = isFulfillmentMode(body.fulfillment) ? body.fulfillment : '';
  const pickupAt = typeof body.pickupAt === 'string' ? body.pickupAt : '';
  const gift = resolveGiftCart({ flagged: true, items, fulfillment: fulfillment || null });
  if (gift.variant !== 'free_pickup') {
    return NextResponse.json(
      { error: 'El canje sin costo es solo Papas Jumbo, recoger en tienda' },
      { status: 400 }
    );
  }
  if (!isValidPickupAt(pickupAt)) {
    return NextResponse.json({ error: 'Elige una hora de recoger válida' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const profile = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email')
    .eq('id', customerId)
    .maybeSingle();
  if (!profile.data) {
    return NextResponse.json({ error: 'No encontramos tu perfil' }, { status: 404 });
  }

  const reward = await getAvailableJumboReward(supabase, customerId);
  if (!reward) {
    return NextResponse.json({ error: 'No tienes un Jumbo pendiente de canje' }, { status: 404 });
  }

  const token = crypto.randomUUID().replace(/-/g, '');
  const name = `${profile.data.first_name} ${profile.data.last_name}`.replace(/\s+/g, ' ').trim();
  const insert = await supabase
    .from('orders')
    .insert({
      stripe_payment_intent_id: `gift_${token.slice(0, 24)}`,
      customer_name: name,
      customer_phone: normalizePhone(String(profile.data.phone)),
      customer_email: String(profile.data.email || ''),
      delivery_address: RESTAURANT_INFO.address,
      delivery_references: 'PROMOCIÓN · Papas Jumbo de regalo',
      total_charged: 0,
      restaurant_payout: 0,
      platform_fee: 0,
      customer_fee: 0,
      delivery_fee: 0,
      status: 'pending',
      items,
      fulfillment_type: 'pickup',
      pickup_at: pickupAt,
      customer_id: customerId,
      loyalty_kind: 'tenth_jumbo',
      profile_login_token: token,
    })
    .select('*')
    .single();

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  const redeemed = await redeemJumboReward(supabase, reward.id, customerId, insert.data.id);
  if (!redeemed) {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', insert.data.id);
    return NextResponse.json({ error: 'El cupón ya no está disponible' }, { status: 409 });
  }

  await sendGiftOrderEmail({
    to: String(profile.data.email || ''),
    customerName: name,
    orderId: insert.data.id,
    token,
    fulfillment: 'pickup',
    pickupAt,
    totalCharged: 0,
  });

  return NextResponse.json({
    order: mapDbOrder(insert.data as DbOrderRow),
  });
}
