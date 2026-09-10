export const KITCHEN_COOKIE = 'lv_kitchen';
const TOKEN_PAYLOAD = 'las-vaqueras-kitchen';

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

export async function kitchenSessionToken(secret: string) {
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
    new TextEncoder().encode(TOKEN_PAYLOAD)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function isValidKitchenSession(cookie: string | undefined) {
  const secret = process.env.KITCHEN_PASSWORD;
  if (!cookie || !secret) return false;
  const expected = await kitchenSessionToken(secret);
  if (cookie.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < cookie.length; i += 1) {
    mismatch |= cookie.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function kitchenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}
