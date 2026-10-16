import { isBranchId, type BranchId } from '@/lib/branches';

export const KITCHEN_COOKIE = 'lv_kitchen';
const TOKEN_PREFIX = 'las-vaqueras-kitchen:';

export function getKitchenHost() {
  return (process.env.NEXT_PUBLIC_KITCHEN_HOST || 'cocina.lasvaqueras.com.mx').toLowerCase();
}

export function hostnameOf(hostHeader: string | null | undefined) {
  return (hostHeader || '').split(':')[0].toLowerCase();
}

export function isKitchenHostname(host: string) {
  return host === getKitchenHost();
}

export function isLocalHostname(host: string) {
  return host === 'localhost' || host === '127.0.0.1';
}

async function signPayload(payload: string) {
  const secret = process.env.KITCHEN_PASSWORD || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function stationIdFor(branch: BranchId) {
  if (branch === 'norte' || branch === 'sur') return branch;
  return 'main';
}

/** null means the lookup failed: the current session stays. */
export function sessionGenerationMatches(cookieGeneration: number, stored: number | null) {
  if (stored == null) return true;
  return cookieGeneration === stored;
}

function sameToken(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

export type KitchenSession = { branch: BranchId; generation: number };

export async function kitchenSessionToken(branch: BranchId, generation = 0) {
  const next = Number.isInteger(generation) && generation >= 0 ? generation : 0;
  const signature = await signPayload(`${TOKEN_PREFIX}${branch}:${next}`);
  return signature ? `${branch}.${next}.${signature}` : '';
}

export async function readKitchenSession(cookie: string | undefined): Promise<KitchenSession | null> {
  if (!cookie) return null;
  const parts = cookie.split('.');
  if (parts.length === 2) {
    const [branch, signature] = parts;
    if (!isBranchId(branch)) return null;
    const expected = await signPayload(`${TOKEN_PREFIX}${branch}`);
    return sameToken(signature, expected) ? { branch, generation: 0 } : null;
  }
  if (parts.length !== 3) return null;
  const [branch, rawGeneration, signature] = parts;
  if (!isBranchId(branch) || !/^\d+$/.test(rawGeneration)) return null;
  const generation = Number(rawGeneration);
  const expected = await signPayload(`${TOKEN_PREFIX}${branch}:${generation}`);
  return sameToken(signature, expected) ? { branch, generation } : null;
}

export async function readKitchenBranch(cookie: string | undefined): Promise<BranchId | null> {
  return (await readKitchenSession(cookie))?.branch ?? null;
}

export async function isValidKitchenSession(cookie: string | undefined) {
  return (await readKitchenSession(cookie)) != null;
}

/** Reads the generation stored for this branch. null = Supabase no respondió. */
export async function storedSessionGeneration(branch: BranchId): Promise<number | null> {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(
      `${url}/rest/v1/kitchen_station?id=eq.${stationIdFor(branch)}&select=session_generation`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: controller.signal,
        cache: 'no-store',
      }
    );
    if (!response.ok) return null;
    const rows = (await response.json()) as { session_generation?: unknown }[];
    const value = rows[0]?.session_generation;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function kitchenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}
