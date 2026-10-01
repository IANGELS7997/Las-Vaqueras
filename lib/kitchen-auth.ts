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

async function signBranch(branch: BranchId) {
  const secret = process.env.KITCHEN_PASSWORD || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${TOKEN_PREFIX}${branch}`)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function sameToken(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) {
    mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function kitchenSessionToken(branch: BranchId) {
  const signature = await signBranch(branch);
  return signature ? `${branch}.${signature}` : '';
}

export async function readKitchenBranch(cookie: string | undefined): Promise<BranchId | null> {
  if (!cookie || !cookie.includes('.')) return null;
  const dot = cookie.indexOf('.');
  const branch = cookie.slice(0, dot);
  const signature = cookie.slice(dot + 1);
  if (!isBranchId(branch)) return null;
  const expected = await signBranch(branch);
  return sameToken(signature, expected) ? branch : null;
}

export async function isValidKitchenSession(cookie: string | undefined) {
  return (await readKitchenBranch(cookie)) != null;
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
