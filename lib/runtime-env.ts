import { ENV_CATALOG } from '@/lib/env-catalog';
import {
  isUsableConnectAccountId,
  resolveStripeConnectDestination,
  STRIPE_CONNECT_DELETED_IDS,
} from '@/lib/stripe-connect-destination';

function envValue(key: string): string {
  return (process.env[key] || '').trim();
}

/** Problemas estáticos (sin probes de red). Solo Production. */
export function collectStaticEnvProblems(
  isProd = process.env.VERCEL_ENV === 'production'
): string[] {
  if (!isProd) return [];
  const problems: string[] = [];

  for (const entry of ENV_CATALOG) {
    const raw = envValue(entry.key);

    if (entry.forbidValues?.length && raw) {
      if (entry.forbidValues.some((v) => raw.toLowerCase() === v.toLowerCase())) {
        problems.push(`${entry.key} tiene valor prohibido en Production`);
      }
    }

    if (entry.requiredInProduction && !raw && entry.severity === 'fatal') {
      problems.push(`Falta ${entry.key} (${entry.purpose})`);
    }

    if (
      raw &&
      entry.expectPrefix &&
      !raw.startsWith(entry.expectPrefix) &&
      entry.severity === 'fatal'
    ) {
      problems.push(`${entry.key} debe empezar con ${entry.expectPrefix}`);
    }
  }

  const pub = envValue('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  const secret = envValue('STRIPE_SECRET_KEY');
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
      envValue('STRIPE_CONNECT_ACCOUNT_ID_LIVE') === deleted ||
      envValue('NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE') === deleted
    ) {
      problems.push(`Connect LIVE apunta a cuenta eliminada ${deleted}`);
    }
  }

  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    problems.push('Falta SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN en Production');
  }

  return problems;
}

export function isFatalEnvProblem(message: string): boolean {
  return (
    message.includes('test') ||
    message.includes('eliminada') ||
    message.includes('destination Connect') ||
    message.includes('pk_live_') ||
    message.includes('sk_live_') ||
    message.includes('UBER_USE_SANDBOX') ||
    message.includes('prohibido') ||
    message.includes('Falta STRIPE_') ||
    message.includes('Falta NEXT_PUBLIC_STRIPE_') ||
    message.includes('Falta SUPABASE_') ||
    message.includes('Falta NEXT_PUBLIC_SUPABASE_') ||
    message.includes('Falta RESEND_API_KEY') ||
    message.includes('Falta KITCHEN_PASSWORD') ||
    message.includes('Falta CUSTOMER_SESSION_SECRET') ||
    message.includes('Falta IANGEL_') ||
    message.includes('Falta UBER_DIRECT_')
  );
}

/**
 * Blindaje de variables críticas en Production.
 * No falla el boot en preview/dev; en production registra errores claros.
 */
export function assertCriticalEnv(): void {
  const problems = collectStaticEnvProblems();
  if (problems.length === 0) return;

  const message = `[blindaje] Production env inválido:\n- ${problems.join('\n- ')}`;
  console.error(message);

  const fatal = problems.some(isFatalEnvProblem);
  if (fatal) throw new Error(message);
}
