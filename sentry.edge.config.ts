import * as Sentry from '@sentry/nextjs';

/** Apagado el 9 nov 2026. Para volver a encender, ver docs/REVOCACION.md. */
Sentry.init({
  dsn: undefined,
  enabled: false,
});
