import * as Sentry from '@sentry/nextjs';
import { assertCriticalEnv } from '@/lib/runtime-env';
import { decideDevSignal, forwardDevSignal } from '@/lib/dev-signal';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  async beforeSend(event) {
    try {
      const value = event.exception?.values?.[0];
      const message = value?.value || event.message || 'Error';
      if (/dev-signal|N8N_DEV_SIGNAL/i.test(message)) return event;
      const frames = value?.stacktrace?.frames || [];
      const stack = frames
        .slice(-8)
        .map((frame) => `${frame.function || '?'} (${frame.filename || ''}:${frame.lineno || 0})`)
        .join('\n');
      const decision = decideDevSignal(
        {
          source: 'las-vaqueras',
          type: 'client_error',
          message: stack ? `${message}\n${stack}` : message,
          page: event.request?.url || event.transaction || 'servidor',
          action: 'servidor',
          at: new Date().toISOString(),
        },
        { userAgent: '', ip: 'server' }
      );
      if (decision.forward && decision.payload) await forwardDevSignal(decision.payload);
    } catch {
      // El aviso no debe impedir que Sentry reciba el stack.
    }
    return event;
  },
});

try {
  assertCriticalEnv();
} catch (err) {
  Sentry.captureException(err);
  console.error('[runtime-env]', err instanceof Error ? err.message : err);
  // En Production no arrancar con mezcla test/live o Connect inválido.
  if (process.env.VERCEL_ENV === 'production') throw err;
}
