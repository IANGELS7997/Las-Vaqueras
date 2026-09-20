/** Live destination = dueño Las Vaqueras. No reutilizar. */
export const STRIPE_CONNECT_OWNER_LIVE = 'acct_1UDqrILSkdFzTSOj';

/** Express desarrollador eliminado el 2026-09-19. Nunca usarlo como destination. */
export const STRIPE_CONNECT_DELETED_IDS = ['acct_1UDRDcLzV1Sjysxx'] as const;

export function isUsableConnectAccountId(id: string | null | undefined): id is string {
  if (!id || !id.startsWith('acct_')) return false;
  return !(STRIPE_CONNECT_DELETED_IDS as readonly string[]).includes(id);
}

/**
 * Resuelve el Connect destination sin caer en cuentas eliminadas.
 * Prioridad: cliente → LIVE env → env genérica → dueño live conocido.
 */
export function resolveStripeConnectDestination(
  fromClient?: string | null,
  env: {
    live?: string | null;
    fallback?: string | null;
  } = {}
): string {
  const candidates = [fromClient, env.live, env.fallback, STRIPE_CONNECT_OWNER_LIVE];
  for (const id of candidates) {
    if (isUsableConnectAccountId(id)) return id;
  }
  return '';
}
