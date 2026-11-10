/**
 * Cierre público de Las Vaqueras (9 nov 2026).
 * El sitio del cliente queda en blanco. Cocina, IANGEL, ops, cron y el webhook
 * de Uber siguen. Para volver a encender el sitio, ver docs/REVOCACION.md.
 */

export const REVOCATION_KEEP_PREFIXES = [
  '/api/iangel',
  '/api/ops',
  '/api/cron',
  '/api/uber/webhook',
  '/api/store-status',
] as const;

export type RevocationDecision = 'passthrough' | 'keep' | 'blank-page' | 'blank-api';

export function revocationKeepPath(pathname: string) {
  return REVOCATION_KEEP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function revocationDecision(input: {
  host: string;
  pathname: string;
  kitchenHost: string;
  local: boolean;
}): RevocationDecision {
  if (input.local || input.host === input.kitchenHost) return 'passthrough';
  if (revocationKeepPath(input.pathname)) return 'keep';
  if (input.pathname.startsWith('/api/')) return 'blank-api';
  return 'blank-page';
}

export const BLANK_STORE_HTML =
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title></title><style>html,body{margin:0;background:#fff;height:100%}</style></head><body></body></html>';
