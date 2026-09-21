/**
 * Catálogo de variables del proyecto (fuente de verdad para blindaje).
 * No incluye valores — solo requisitos y dónde se usan.
 */

export type EnvSeverity = 'fatal' | 'warn' | 'info';

export type EnvCheck = {
  key: string;
  /** Qué rompe si falta o está mal. */
  purpose: string;
  /** Archivos / áreas principales. */
  usedBy: string[];
  /** Obligatoria en Vercel Production. */
  requiredInProduction: boolean;
  severity: EnvSeverity;
  /** Prefijo esperado (pk_live_, sk_live_, etc.). */
  expectPrefix?: string;
  /** Valores prohibidos en Production. */
  forbidValues?: string[];
  /** Si es pública (NEXT_PUBLIC_). */
  publicClient?: boolean;
};

export const ENV_CATALOG: EnvCheck[] = [
  {
    key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    purpose: 'Checkout / Payment Element (cliente)',
    usedBy: ['lib/stripe-js.ts', 'app/checkout'],
    requiredInProduction: true,
    severity: 'fatal',
    expectPrefix: 'pk_live_',
    publicClient: true,
  },
  {
    key: 'STRIPE_SECRET_KEY',
    purpose: 'PaymentIntents, refunds, Connect (servidor)',
    usedBy: ['lib/stripe.ts', 'app/api/checkout', 'app/api/orders', 'app/api/refund'],
    requiredInProduction: true,
    severity: 'fatal',
    expectPrefix: 'sk_live_',
  },
  {
    key: 'STRIPE_CONNECT_ACCOUNT_ID_LIVE',
    purpose: 'Destination Express del dueño (85% comida)',
    usedBy: ['lib/stripe-connect-destination.ts', 'app/api/checkout'],
    requiredInProduction: true,
    severity: 'fatal',
    expectPrefix: 'acct_',
  },
  {
    key: 'NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE',
    purpose: 'Destination Connect en el cliente (checkout)',
    usedBy: ['app/checkout/page.tsx'],
    requiredInProduction: true,
    severity: 'warn',
    expectPrefix: 'acct_',
    publicClient: true,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    purpose: 'Base URL Supabase',
    usedBy: ['lib/supabase.ts', 'lib/supabase-admin.ts', 'lib/customers.ts'],
    requiredInProduction: true,
    severity: 'fatal',
    expectPrefix: 'https://',
    publicClient: true,
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    purpose: 'Cliente Supabase (realtime / público)',
    usedBy: ['lib/supabase.ts'],
    requiredInProduction: true,
    severity: 'fatal',
    publicClient: true,
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    purpose: 'Admin DB (pedidos, cocina, lealtad)',
    usedBy: ['lib/supabase-admin.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'SENTRY_DSN',
    purpose: 'Errores servidor → Sentry',
    usedBy: ['sentry.server.config.ts', 'sentry.edge.config.ts'],
    requiredInProduction: true,
    severity: 'warn',
  },
  {
    key: 'NEXT_PUBLIC_SENTRY_DSN',
    purpose: 'Errores cliente → Sentry',
    usedBy: ['sentry.client.config.ts', 'app/global-error.tsx'],
    requiredInProduction: true,
    severity: 'warn',
    publicClient: true,
  },
  {
    key: 'RESEND_API_KEY',
    purpose: 'Correos (regalos, alerta cocina offline)',
    usedBy: ['lib/gift-order-email.ts', 'lib/kitchen-station.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'RESEND_FROM_EMAIL',
    purpose: 'Remitente transaccional',
    usedBy: ['lib/gift-order-email.ts', 'lib/kitchen-station.ts'],
    requiredInProduction: false,
    severity: 'info',
  },
  {
    key: 'KITCHEN_PASSWORD',
    purpose: 'Login cocina',
    usedBy: ['lib/kitchen-auth.ts', 'app/api/kitchen/login'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'NEXT_PUBLIC_KITCHEN_HOST',
    purpose: 'Host permitido para /admin',
    usedBy: ['lib/kitchen-auth.ts', 'middleware'],
    requiredInProduction: false,
    severity: 'info',
    publicClient: true,
  },
  {
    key: 'CUSTOMER_SESSION_SECRET',
    purpose: 'Firmar cookie de perfil (hoy cae a service role/kitchen si falta)',
    usedBy: ['lib/customer-auth.ts', 'lib/loyalty-reward.ts'],
    requiredInProduction: true,
    severity: 'warn',
  },
  {
    key: 'IANGEL_RIDER_PASSWORD',
    purpose: 'Login app repartidor',
    usedBy: ['lib/iangel-auth.ts', 'app/api/iangel/login'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'IANGEL_API_SECRET',
    purpose: 'Tokens API IANGEL / firma de quotes',
    usedBy: ['lib/iangel-auth.ts', 'lib/iangel-quote-token.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'IANGEL_APP_ORIGIN',
    purpose: 'CORS orígenes app rider',
    usedBy: ['lib/iangel-auth.ts'],
    requiredInProduction: false,
    severity: 'warn',
  },
  {
    key: 'UBER_DIRECT_CLIENT_ID',
    purpose: 'OAuth Uber Direct (cotización / delivery)',
    usedBy: ['lib/uber-direct.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'UBER_DIRECT_CLIENT_SECRET',
    purpose: 'OAuth Uber Direct secret',
    usedBy: ['lib/uber-direct.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'UBER_DIRECT_CUSTOMER_ID',
    purpose: 'Customer ID Uber Direct',
    usedBy: ['lib/uber-direct.ts'],
    requiredInProduction: true,
    severity: 'fatal',
  },
  {
    key: 'UBER_DIRECT_WEBHOOK_SECRET',
    purpose: 'Validar webhooks Uber',
    usedBy: ['app/api/uber/webhook/route.ts'],
    requiredInProduction: true,
    severity: 'warn',
  },
  {
    key: 'UBER_USE_SANDBOX',
    purpose: 'Forzar sandbox Uber (solo preview/dev)',
    usedBy: ['lib/uber-direct.ts'],
    requiredInProduction: false,
    severity: 'fatal',
    forbidValues: ['1', 'true'],
  },
  {
    key: 'OPS_HEALTH_SECRET',
    purpose: 'Token para /api/ops/health desde el celular',
    usedBy: ['app/api/ops/health/route.ts'],
    requiredInProduction: true,
    severity: 'warn',
  },
  {
    key: 'CRON_SECRET',
    purpose: 'Auth del watchdog cocina (Hobby: cron desactivado)',
    usedBy: ['app/api/cron/kitchen-watchdog/route.ts'],
    requiredInProduction: false,
    severity: 'info',
  },
];

/** Vars residuales: no deben ser destination LIVE. */
export const ENV_RESIDUAL_WARN = [
  'STRIPE_CONNECT_ACCOUNT_ID',
  'NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID',
] as const;

/** Presentes en Vercel pero sin uso en runtime actual. */
export const ENV_ORPHAN = [
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
] as const;
