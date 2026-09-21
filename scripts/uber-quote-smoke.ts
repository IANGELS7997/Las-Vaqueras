/**
 * Smoke: Uber Direct quote only (no Create Delivery / no courier).
 * Usage: UBER_USE_SANDBOX=1 npx tsx scripts/uber-quote-smoke.ts
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createDeliveryQuote, isUberQuoteConfigured } from '../lib/uber-direct';

function loadEnvFile(fileName: string) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim();
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
process.env.UBER_USE_SANDBOX = process.env.UBER_USE_SANDBOX || '1';

async function main() {
  console.log('sandbox=', process.env.UBER_USE_SANDBOX);
  console.log('configured=', isUberQuoteConfigured());
  if (!isUberQuoteConfigured()) {
    throw new Error('Uber no configurado (faltan credenciales o placeholder n8n)');
  }
  const quote = await createDeliveryQuote({
    dropoffStreet: 'Calle Independencia 100, Centro',
    dropoffZip: '31000',
    dropoffLat: 28.6353,
    dropoffLng: -106.0889,
    dropoffPhone: '+526144136539',
  });
  console.log('quote_ok', {
    feeMxn: quote.fee,
    quoteId: quote.quoteId ? `${quote.quoteId.slice(0, 8)}…` : null,
    durationMinutes: quote.durationMinutes,
  });
}

main().catch((err) => {
  console.error('quote_fail', err instanceof Error ? err.message : err);
  process.exit(1);
});
