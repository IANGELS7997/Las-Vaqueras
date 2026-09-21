import * as Sentry from '@sentry/nextjs';
import { assertCriticalEnv } from '@/lib/runtime-env';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});

try {
  assertCriticalEnv();
} catch (err) {
  Sentry.captureException(err);
  console.error('[runtime-env]', err instanceof Error ? err.message : err);
  // En Production no arrancar con mezcla test/live o Connect inválido.
  if (process.env.VERCEL_ENV === 'production') throw err;
}
