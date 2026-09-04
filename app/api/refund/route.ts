import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

async function markOrderCancelled(paymentIntentId: string) {
  const supabase = createAdminSupabase();
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', paymentIntentId);
}

export async function POST(req: Request) {
  let paymentIntentId: string | undefined;

  try {
    const body = await req.json();
    paymentIntentId = body.paymentIntentId;

    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'paymentIntentId inválido' }, { status: 400 });
    }

    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    await markOrderCancelled(paymentIntentId);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
      },
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      const alreadyRefunded =
        error.code === 'charge_already_refunded' ||
        error.message.toLowerCase().includes('already been refunded');

      if (alreadyRefunded && paymentIntentId) {
        await markOrderCancelled(paymentIntentId);
        return NextResponse.json({ success: true, refund: { status: 'already_refunded' } });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'No se pudo reembolsar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
