import type { SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { reopenCashPlatformFees } from '@/lib/cash-platform-fee-store';
import { getStripe } from '@/lib/stripe';

/** Devuelve el cobro completo de la tarjeta y revierte el reparto de Connect. */
export async function refundCardCharge(supabase: SupabaseClient, paymentIntentId: string) {
  const id = paymentIntentId.trim();
  if (!id.startsWith('pi_')) throw new Error('Ese pedido no tiene un cobro de tarjeta');
  const stripe = getStripe();
  try {
    const refund = await stripe.refunds.create({
      payment_intent: id,
      reverse_transfer: true,
      refund_application_fee: true,
    });
    await reopenCashPlatformFees(supabase, id);
    return {
      id: refund.id,
      status: refund.status || 'pending',
      amount: refund.amount,
    };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      const already =
        error.code === 'charge_already_refunded' ||
        error.message.toLowerCase().includes('already been refunded');
      if (already) {
        await reopenCashPlatformFees(supabase, id);
        return { id: '', status: 'already_refunded', amount: 0 };
      }
      throw new Error(error.message);
    }
    throw error instanceof Error ? error : new Error('No se pudo reembolsar la tarjeta');
  }
}
