import { NextResponse } from 'next/server';
import { IANGEL_SLUG } from '@/lib/iangel-constants';

export const IANGEL_COOKIE = 'lv_iangel';
const TOKEN_PREFIX = 'iangel-rider';

function iangelSecret() {
  return process.env.IANGEL_API_SECRET || '';
}

function riderPassword() {
  return process.env.IANGEL_RIDER_PASSWORD || '';
}

export function iangelAllowedOrigins() {
  const extra = (process.env.IANGEL_APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return ['https://app.pureiangel.com', 'http://localhost:3001', 'http://127.0.0.1:3001', ...extra];
}

export function iangelCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = iangelAllowedOrigins();
  const match = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Iangel-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    Vary: 'Origin',
  };
}

export function iangelPreflight(req: Request) {
  return new NextResponse(null, { status: 204, headers: iangelCorsHeaders(req) });
}

export function iangelJson(req: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: iangelCorsHeaders(req) });
}

async function hmacHex(payload: string, secret: string) {
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

function timingSafeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function iangelSessionToken(secret = iangelSecret()) {
  if (!secret) return '';
  return hmacHex(`${TOKEN_PREFIX}:${IANGEL_SLUG}`, secret);
}

export function passwordMatches(input: string) {
  const expected = riderPassword();
  return Boolean(expected) && timingSafeEqual(input, expected);
}

export async function isValidIangelAuth(req: Request) {
  const secret = iangelSecret();
  if (!secret) return false;
  const headerKey = req.headers.get('x-iangel-key') || '';
  if (headerKey && timingSafeEqual(headerKey, secret)) return true;
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const expected = await iangelSessionToken(secret);
  const cookie = req.headers.get('cookie') || '';
  const cookieMatch = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${IANGEL_COOKIE}=`));
  const cookieValue = cookieMatch ? decodeURIComponent(cookieMatch.split('=').slice(1).join('=')) : '';
  return Boolean(expected) && (timingSafeEqual(bearer, expected) || timingSafeEqual(cookieValue, expected));
}

export async function requireIangel(req: Request) {
  if (req.method === 'OPTIONS') return iangelPreflight(req);
  if (await isValidIangelAuth(req)) return null;
  return iangelJson(req, { error: 'No autorizado' }, 401);
}

export function iangelCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'none' as const,
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 16,
  };
}
