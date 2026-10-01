import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import { releaseCashPlatformHold } from '@/lib/cash-platform-fee-store';
import { getStripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase-admin';

/** Cancela un cobro con tarjeta que todavía no se pagó, para poder pasar a efectivo sin dejar dos pedidos. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const paymentIntentId = typeof body?.paymentIntentId === 'string' ? body.paymentIntentId.trim() : '';
    if (!paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'Falta el pago con tarjeta por cancelar' }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    const existing = await supabase
      .from('orders')
      .select('id, status, pay_method')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();
    if (existing.error) {
      return NextResponse.json({ error: 'No se pudo revisar el pago' }, { status: 500 });
    }
    if (!existing.data) {
      return NextResponse.json({ error: 'No encontramos ese pago' }, { status: 404 });
    }
    if (existing.data.status === 'cancelled') {
      return NextResponse.json({ ok: true });
    }
    if (existing.data.status !== 'awaiting_payment' || existing.data.pay_method === 'cash') {
      return NextResponse.json(
        { error: 'Ese pago ya no se puede cambiar a efectivo' },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === 'succeeded' || intent.status === 'processing') {
      return NextResponse.json({ error: 'El pago con tarjeta ya se procesó' }, { status: 409 });
    }
    if (intent.status !== 'canceled') {
      await stripe.paymentIntents.cancel(paymentIntentId);
    }

    const stillOpen = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', existing.data.id)
      .maybeSingle();
    if (stillOpen.data && stillOpen.data.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'El pago con tarjeta ya se procesó' }, { status: 409 });
    }

    await releaseCashPlatformHold(supabase, paymentIntentId);

    await supabase
      .from('loyalty_rewards')
      .update({
        status: 'available',
        reserved_payment_intent_id: null,
        reserved_at: null,
      })
      .eq('reserved_payment_intent_id', paymentIntentId)
      .eq('status', 'reserved');

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    const message =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : 'No se pudo cancelar el pago con tarjeta';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
