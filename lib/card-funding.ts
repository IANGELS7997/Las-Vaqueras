import type Stripe from 'stripe';

export type CardFunding = 'debit' | 'credit' | 'prepaid' | 'unknown';

export function isCardFunding(value: unknown): value is CardFunding {
  return value === 'debit' || value === 'credit' || value === 'prepaid' || value === 'unknown';
}

export function cardFundingFromPaymentIntent(paymentIntent: Stripe.PaymentIntent): CardFunding | null {
  const charge = paymentIntent.latest_charge;
  if (!charge || typeof charge === 'string') return null;
  const funding = charge.payment_method_details?.card?.funding;
  return isCardFunding(funding) ? funding : null;
}

export function paymentCardLabel(funding: string | null | undefined): string {
  if (funding === 'debit') return 'Pago: Tarjeta de débito';
  if (funding === 'credit') return 'Pago: Tarjeta de crédito';
  if (funding === 'prepaid') return 'Pago: Tarjeta prepago';
  return 'Pago: Tarjeta';
}
