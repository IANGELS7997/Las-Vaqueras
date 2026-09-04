import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey || secretKey.includes('...')) {
    throw new Error('STRIPE_SECRET_KEY de test no está configurada');
  }

  if (secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')) {
    throw new Error('Este checkout solo acepta claves de test (sk_test_ / rk_test_)');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-07-29.dahlia',
    });
  }

  return stripeClient;
}
