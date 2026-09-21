import {
  ENV_CATALOG,
  ENV_RESIDUAL_WARN,
  type EnvSeverity,
} from '@/lib/env-catalog';
import {
  isUsableConnectAccountId,
  resolveStripeConnectDestination,
  STRIPE_CONNECT_DELETED_IDS,
  STRIPE_CONNECT_OWNER_LIVE,
} from '@/lib/stripe-connect-destination';
import {
  isKitchenStationOnline,
  KITCHEN_STATION_ID,
  type KitchenStationRow,
  viewKitchenStation,
} from '@/lib/kitchen-station';
import { createAdminSupabase } from '@/lib/supabase-admin';

export type OpsCheck = {
  id: string;
  ok: boolean;
  severity: EnvSeverity;
  label: string;
  detail: string;
};

export type OpsHealthReport = {
  ok: boolean;
  fatal: boolean;
  checkedAt: string;
  vercelEnv: string | null;
  checks: OpsCheck[];
  kitchen: ReturnType<typeof viewKitchenStation> | null;
  summary: {
    fatal: number;
    warn: number;
    info: number;
    ok: number;
  };
};

function hasValue(key: string): boolean {
  return Boolean((process.env[key] || '').trim());
}

function envValue(key: string): string {
  return (process.env[key] || '').trim();
}

/** Evalúa catálogo + Connect + cocina (sin secretos en la respuesta). */
export async function buildOpsHealthReport(): Promise<OpsHealthReport> {
  const checks: OpsCheck[] = [];
  const isProd = process.env.VERCEL_ENV === 'production';

  for (const entry of ENV_CATALOG) {
    const raw = envValue(entry.key);
    const present = Boolean(raw);

    if (entry.forbidValues?.length && present) {
      const forbidden = entry.forbidValues.some((v) => raw.toLowerCase() === v.toLowerCase());
      if (forbidden && isProd) {
        checks.push({
          id: `env:${entry.key}`,
          ok: false,
          severity: entry.severity,
          label: entry.key,
          detail: `Valor prohibido en Production (${entry.purpose})`,
        });
        continue;
      }
    }

    if (entry.requiredInProduction && isProd && !present) {
      checks.push({
        id: `env:${entry.key}`,
        ok: false,
        severity: entry.severity,
        label: entry.key,
        detail: `Falta en Production — ${entry.purpose}`,
      });
      continue;
    }

    if (present && entry.expectPrefix && !raw.startsWith(entry.expectPrefix)) {
      const severity: EnvSeverity =
        isProd && entry.severity === 'fatal' ? 'fatal' : entry.severity === 'fatal' ? 'warn' : entry.severity;
      checks.push({
        id: `env:${entry.key}`,
        ok: false,
        severity,
        label: entry.key,
        detail: `Prefijo esperado ${entry.expectPrefix} — ${entry.purpose}`,
      });
      continue;
    }

    if (present || (entry.requiredInProduction && isProd)) {
      checks.push({
        id: `env:${entry.key}`,
        ok: present,
        severity: present ? 'info' : entry.severity,
        label: entry.key,
        detail: present ? `OK — ${entry.purpose}` : `Falta — ${entry.purpose}`,
      });
    }
  }

  const secret = envValue('STRIPE_SECRET_KEY');
  const pub = envValue('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (isProd && (pub.startsWith('pk_test_') || secret.startsWith('sk_test_'))) {
    checks.push({
      id: 'stripe:test-in-prod',
      ok: false,
      severity: 'fatal',
      label: 'Stripe test/live',
      detail: 'Claves de test detectadas en Production',
    });
  } else {
    checks.push({
      id: 'stripe:test-in-prod',
      ok: true,
      severity: 'info',
      label: 'Stripe test/live',
      detail: 'Sin mezcla test en Production',
    });
  }

  const destination = resolveStripeConnectDestination(null, {
    live: process.env.STRIPE_CONNECT_ACCOUNT_ID_LIVE,
    fallback: process.env.STRIPE_CONNECT_ACCOUNT_ID,
  });
  const destOk = isUsableConnectAccountId(destination);
  checks.push({
    id: 'stripe:connect-destination',
    ok: destOk,
    severity: destOk ? 'info' : 'fatal',
    label: 'Connect destination',
    detail: destOk
      ? `Destination usable (${destination === STRIPE_CONNECT_OWNER_LIVE ? 'dueño live' : 'acct_…'})`
      : 'Sin destination Connect válido',
  });

  for (const deleted of STRIPE_CONNECT_DELETED_IDS) {
    const hit =
      envValue('STRIPE_CONNECT_ACCOUNT_ID_LIVE') === deleted ||
      envValue('NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID_LIVE') === deleted;
    checks.push({
      id: `stripe:deleted:${deleted}`,
      ok: !hit,
      severity: hit ? 'fatal' : 'info',
      label: 'Connect eliminada',
      detail: hit ? `LIVE apunta a cuenta eliminada ${deleted}` : `OK (no usa ${deleted.slice(0, 12)}…)`,
    });
  }

  for (const key of ENV_RESIDUAL_WARN) {
    if (hasValue(key) && isProd) {
      checks.push({
        id: `residual:${key}`,
        ok: true,
        severity: 'info',
        label: key,
        detail: 'Residual presente; el código prioriza *_LIVE y bloquea eliminadas',
      });
    }
  }

  let kitchenView: ReturnType<typeof viewKitchenStation> | null = null;
  try {
    const supabase = createAdminSupabase();
    const { error } = await supabase.from('orders').select('id').limit(1);
    checks.push({
      id: 'probe:supabase',
      ok: !error,
      severity: error ? 'fatal' : 'info',
      label: 'Supabase',
      detail: error ? `DB no responde: ${error.message}` : 'Consulta orders OK',
    });

    const station = await supabase
      .from('kitchen_station')
      .select('*')
      .eq('id', KITCHEN_STATION_ID)
      .maybeSingle();
    const row = (station.data || null) as KitchenStationRow | null;
    kitchenView = viewKitchenStation(row);
    const online = isKitchenStationOnline(row);
    checks.push({
      id: 'probe:kitchen',
      ok: true,
      severity: online ? 'info' : 'warn',
      label: 'Cocina estación',
      detail: kitchenView.statusLabel + ' — ' + kitchenView.detail,
    });
  } catch (err) {
    checks.push({
      id: 'probe:supabase',
      ok: false,
      severity: 'fatal',
      label: 'Supabase',
      detail: err instanceof Error ? err.message : 'Error al conectar',
    });
  }

  if (secret.startsWith('sk_')) {
    try {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
      });
      checks.push({
        id: 'probe:stripe',
        ok: res.ok,
        severity: res.ok ? 'info' : 'fatal',
        label: 'Stripe API',
        detail: res.ok ? 'Balance reachable' : `HTTP ${res.status}`,
      });
    } catch (err) {
      checks.push({
        id: 'probe:stripe',
        ok: false,
        severity: 'fatal',
        label: 'Stripe API',
        detail: err instanceof Error ? err.message : 'Sin respuesta',
      });
    }
  }

  const resend = envValue('RESEND_API_KEY');
  checks.push({
    id: 'probe:resend-key',
    ok: Boolean(resend) && resend.startsWith('re_'),
    severity: !resend && isProd ? 'fatal' : resend.startsWith('re_') ? 'info' : 'warn',
    label: 'Resend',
    detail: !resend ? 'Sin API key' : resend.startsWith('re_') ? 'Key presente' : 'Key con formato raro',
  });

  const summary = {
    fatal: checks.filter((c) => !c.ok && c.severity === 'fatal').length,
    warn: checks.filter((c) => !c.ok && c.severity === 'warn').length,
    info: checks.filter((c) => !c.ok && c.severity === 'info').length,
    ok: checks.filter((c) => c.ok).length,
  };

  return {
    ok: summary.fatal === 0,
    fatal: summary.fatal > 0,
    checkedAt: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV || null,
    checks,
    kitchen: kitchenView,
    summary,
  };
}
