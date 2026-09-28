import * as Sentry from '@sentry/nextjs';
import { reportClientError } from '@/lib/dev-signal-client';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  beforeSend(event, hint) {
    const error = hint?.originalException;
    const message =
      error instanceof Error
        ? error.message
        : event.exception?.values?.[0]?.value || event.message || 'Error';
    const stack = error instanceof Error ? error.stack : '';
    reportClientError(message, stack);
    return event;
  },
});
