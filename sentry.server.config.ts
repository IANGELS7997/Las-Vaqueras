import * as Sentry from '@sentry/nextjs';
import { assertCriticalEnv } from '@/lib/runtime-env';

/** Apagado el 9 nov 2026. Para volver a encender, ver docs/REVOCACION.md. */
Sentry.init({
  dsn: undefined,
  enabled: false,
});

try {
  assertCriticalEnv();
} catch (err) {
  console.error('[runtime-env]', err instanceof Error ? err.message : err);
  if (process.env.VERCEL_ENV === 'production') throw err;
}
