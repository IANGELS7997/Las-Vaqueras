import {
  isUsableConnectAccountId,
  resolveStripeConnectDestination,
  STRIPE_CONNECT_DELETED_IDS,
} from '@/lib/stripe-connect-destination';

/**
 * Blindaje de variables críticas en Production.
 * No falla el boot en preview/dev; en production registra errores claros.
 */
export function assertCriticalEnv(): void {
  const isProd = process.env.VERCEL_ENV === 'production';
  if (!isProd) return;

  const problems: string[] = [];

  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const secret = process.env.STRIPE_SECRET_KEY || '';
  if (!pub.startsWith('pk_live_')) {
    problems.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY debe ser pk_live_ en Production');
  }
  if (!secret.startsWith('sk_live_')) {
    problems.push('STRIPE_SECRET_KEY debe ser sk_live_ en Production');
  }
  if (pub.startsWith('pk_test_') || secret.startsWith('sk_test_')) {
    problems.push('Claves Stripe de test detectadas en Production (mezcla peligrosa)');
  }

  const destination = resolveStripeConnectDestination(null, {
    live: process.env.STRIPE_CONNECT_ACCOUNT_ID_LIVE,
    fallback: process.env.STRIPE_CONNECT_ACCOUNT_ID,
  });
  if (!isUsableConnectAccountId(destination)) {
    problems.push('Falta destination Connect válido (dueño live)');
  }
  for (const deleted of STRIPE_CONNECT_DELETED_IDS) {
    if (
      process.env.STRIPE_CONNECT_ACCOUNT_ID_LIVE === deleted ||
      process.env.NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE === deleted
    ) {
      problems.push(`Connect LIVE apunta a cuenta eliminada ${deleted}`);
    }
  }

  if (process.env.UBER_USE_SANDBOX === '1' || process.env.UBER_USE_SANDBOX === 'true') {
    problems.push('UBER_USE_SANDBOX=1 no debe estar en Production');
  }

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    problems.push('Falta SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN en Production');
  }

  if (problems.length === 0) return;

  const message = `[blindaje] Production env inválido:\n- ${problems.join('\n- ')}`;
  console.error(message);

  // Solo tumba el boot si hay mezcla test/live o Connect eliminado (riesgo de cobro mal).
  const fatal = problems.some(
    (p) =>
      p.includes('test') ||
      p.includes('eliminada') ||
      p.includes('destination Connect') ||
      p.includes('pk_live_') ||
      p.includes('sk_live_')
  );
  if (fatal) throw new Error(message);
}
