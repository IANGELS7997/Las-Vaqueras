import { cookies } from 'next/headers';

export const CUSTOMER_COOKIE = 'lv_customer';

function sessionSecret() {
  return (
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.KITCHEN_PASSWORD ||
    ''
  );
}

async function hmacHex(payload: string) {
  const secret = sessionSecret();
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

export async function customerSessionToken(customerId: string) {
  const signature = await hmacHex(customerId);
  return `${customerId}.${signature}`;
}

export async function customerIdFromCookie(cookie: string | undefined) {
  if (!cookie || !cookie.includes('.')) return null;
  const [customerId, signature] = cookie.split('.');
  if (!customerId || !signature) return null;
  const expected = await hmacHex(customerId);
  if (!expected || signature.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? customerId : null;
}

export function customerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export async function readCustomerIdFromRequest() {
  return customerIdFromCookie(cookies().get(CUSTOMER_COOKIE)?.value);
}
