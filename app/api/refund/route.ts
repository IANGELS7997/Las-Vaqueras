import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { closeIangelOpsOrder, type IangelOpsRow } from '@/lib/iangel-ops';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { orderBranchId } from '@/lib/branches';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { reopenCashPlatformFees } from '@/lib/cash-platform-fee-store';

export const runtime = 'nodejs';

async function markOrderCancelled(paymentIntentId: string) {
  const supabase = createAdminSupabase();
  const found = await supabase
    .from('orders')
    .select('id, delivery_provider, fulfillment_type, dropoff_lat, dropoff_lng')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('stripe_payment_intent_id', paymentIntentId);
  if (found.data) {
    void closeIangelOpsOrder(found.data as IangelOpsRow, 'cancelled').catch(() => undefined);
  }
}

export async function POST(req: Request) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;

  let paymentIntentId: string | undefined;

  try {
    const body = await req.json();
    paymentIntentId = body.paymentIntentId;

    if (typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
      return NextResponse.json({ error: 'paymentIntentId inválido' }, { status: 400 });
    }

    const owned = await createAdminSupabase()
      .from('orders')
      .select('branch_id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();
    if (!owned.data || orderBranchId(owned.data.branch_id) !== branch) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });

    await markOrderCancelled(paymentIntentId);
    await reopenCashPlatformFees(createAdminSupabase(), paymentIntentId);

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
    Sentry.captureException(error);
    if (error instanceof Stripe.errors.StripeError) {
      const alreadyRefunded =
        error.code === 'charge_already_refunded' ||
        error.message.toLowerCase().includes('already been refunded');

      if (alreadyRefunded && paymentIntentId) {
        await markOrderCancelled(paymentIntentId);
        await reopenCashPlatformFees(createAdminSupabase(), paymentIntentId);
        return NextResponse.json({ success: true, refund: { status: 'already_refunded' } });
      }

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : 'No se pudo reembolsar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
