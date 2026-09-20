/**
 * Organiza cuentas Connect live según el mapa acordado:
 * - Plataforma AS EUNOIA: acct_1UBgeMPukuGTlRTl (no se toca como Connect)
 * - Dueño Las Vaqueras: acct_1UDqrILSkdFzTSOj → branding limpio
 * - Express desarrollador dormido: acct_1UDRDcLzV1Sjysxx → eliminar
 *
 * Uso (live):
 *   npm run stripe:organize-connect
 *   (con STRIPE_SECRET_KEY_LIVE=sk_live_... en .env o en la shell)
 *
 * Opcional: DRY_RUN=1 para solo inspeccionar.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import Stripe from 'stripe';

function loadEnvFile(fileName: string) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const PLATFORM = 'acct_1UBgeMPukuGTlRTl';
const OWNER = 'acct_1UDqrILSkdFzTSOj';
const DORMANT_DEV = 'acct_1UDRDcLzV1Sjysxx';

const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function requireLiveKey(): string {
  const candidates = [
    process.env.STRIPE_SECRET_KEY_LIVE?.trim(),
    process.env.STRIPE_SECRET_KEY?.trim(),
  ].filter(Boolean) as string[];
  const key = candidates.find(
    (k) => k.startsWith('sk_live_') || k.startsWith('rk_live_')
  );
  if (!key) {
    throw new Error(
      'Falta STRIPE_SECRET_KEY_LIVE (sk_live_... o rk_live_ con permisos Connect). No uses sk_test_.'
    );
  }
  return key;
}

function summarizeAccount(a: Stripe.Account) {
  return {
    id: a.id,
    email: a.email,
    business_profile_name: a.business_profile?.name,
    business_profile_url: a.business_profile?.url,
    dashboard_display_name: a.settings?.dashboard?.display_name,
    statement_descriptor: a.settings?.payments?.statement_descriptor,
    statement_descriptor_prefix: a.settings?.card_payments?.statement_descriptor_prefix,
    charges_enabled: a.charges_enabled,
    payouts_enabled: a.payouts_enabled,
    transfers: a.capabilities?.transfers,
  };
}

async function main() {
  const stripe = new Stripe(requireLiveKey());
  console.log(dryRun ? '=== DRY RUN ===' : '=== APPLY ===');
  console.log(`Plataforma (referencia): ${PLATFORM}`);

  const ownerBefore = await stripe.accounts.retrieve(OWNER);
  console.log('\nDueño ANTES:', summarizeAccount(ownerBefore));

  const ownerUpdate: Stripe.AccountUpdateParams = {
    business_profile: {
      name: 'Las Vaqueras',
      url: 'https://www.lasvaqueras.com.mx',
      support_email: 'servicio@lasvaqueras.com.mx',
      support_phone: '+526144136539',
    },
    settings: {
      payments: {
        statement_descriptor: 'LAS-VAQUERAS-WEB',
      },
      card_payments: {
        statement_descriptor_prefix: 'LASVAQUERA',
      },
    },
  };

  if (dryRun) {
    console.log('\nDueño UPDATE propuesto:', JSON.stringify(ownerUpdate, null, 2));
  } else {
    try {
      const ownerAfter = await stripe.accounts.update(OWNER, ownerUpdate);
      console.log('\nDueño DESPUÉS:', summarizeAccount(ownerAfter));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `\nNo se pudo actualizar el dueño por API (Express suele limitar campos): ${msg}`
      );
      const link = await stripe.accountLinks.create({
        account: OWNER,
        refresh_url: 'https://www.lasvaqueras.com.mx/',
        return_url: 'https://www.lasvaqueras.com.mx/',
        type: 'account_update',
      });
      console.log(
        '\nLink Express para limpiar marca (caduca pronto):\n',
        link.url
      );
    }
  }

  let dormant: Stripe.Account | null = null;
  try {
    dormant = await stripe.accounts.retrieve(DORMANT_DEV);
    console.log('\nExpress dormido ANTES:', summarizeAccount(dormant));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\nExpress dormido ${DORMANT_DEV}: no encontrado o ya eliminado (${msg})`);
  }

  if (dormant) {
    if (dryRun) {
      console.log(`\nSe eliminaría: ${DORMANT_DEV}`);
    } else {
      try {
        const deleted = await stripe.accounts.del(DORMANT_DEV);
        console.log('\nExpress dormido eliminado:', deleted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `\nNo se pudo eliminar ${DORMANT_DEV}: ${msg}\n` +
            'Dashboard → Connect → Accounts → cuenta → Reject/Delete (saldo $0).'
        );
      }
    }
  }

  console.log(`
Listo.
- Destination live: ${OWNER}
- No uses ${DORMANT_DEV} en cobros
- Plataforma Dashboard: nombre AS EUNOIA, quitar Pureiangel
- Borra STRIPE_SECRET_KEY_LIVE del .env cuando termines
- n8n de pago sigue inactivo
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
