import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const TOKEN_PREFIX = 'iangel.v1.';
const TOKEN_V2 = 'iangel.v2.';
export const ANGEL_RIDER_KEY = 'angel';

export function iangelAllowedOrigins() {
  const extra = (process.env.IANGEL_APP_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return [
    'https://app.pureiangel.com',
    'https://app-pureiangel.vercel.app',
    'https://app-pureiangel-angel-salinas-creador.vercel.app',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    ...extra,
  ];
}

function isIangelAppOrigin(origin: string) {
  if (iangelAllowedOrigins().includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.startsWith('app-pureiangel-') && host.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

export function iangelCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const match = isIangelAppOrigin(origin) ? origin : iangelAllowedOrigins()[0];
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

export function readIangelBearer(req: Request) {
  const auth = req.headers.get('authorization') || '';
  return auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
}

function tokenSecret() {
  return process.env.IANGEL_API_SECRET || process.env.IANGEL_RIDER_PASSWORD || '';
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function issueIangelToken(riderKey = ANGEL_RIDER_KEY) {
  const secret = tokenSecret();
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const sub = riderKey.trim() || ANGEL_RIDER_KEY;
  const body = `${exp}.${sub}`;
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return `${TOKEN_V2}${body}.${sig}`;
}

function signatureMatches(body: string, sig: string) {
  const secret = tokenSecret();
  if (!secret || !sig) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return safeEqual(expected, sig);
}

export function verifyIangelToken(token: string) {
  return readIangelRiderKey(token) != null;
}

/** Quién es este celular. La contraseña compartida sigue siendo la de Angel. */
export function readIangelRiderKey(token: string) {
  if (!token) return null;
  if (token.startsWith(TOKEN_V2)) {
    const rest = token.slice(TOKEN_V2.length);
    const dot = rest.lastIndexOf('.');
    if (dot < 0) return null;
    const body = rest.slice(0, dot);
    const sig = rest.slice(dot + 1);
    if (!signatureMatches(body, sig)) return null;
    const split = body.indexOf('.');
    if (split < 0) return null;
    const exp = Number(body.slice(0, split));
    const sub = body.slice(split + 1).trim();
    if (!Number.isFinite(exp) || Date.now() >= exp || !sub) return null;
    return sub;
  }
  if (token.startsWith(TOKEN_PREFIX)) {
    const rest = token.slice(TOKEN_PREFIX.length);
    const dot = rest.lastIndexOf('.');
    if (dot < 0) return null;
    const body = rest.slice(0, dot);
    const sig = rest.slice(dot + 1);
    if (!signatureMatches(body, sig)) return null;
    const exp = Number(body);
    if (!Number.isFinite(exp) || Date.now() >= exp) return null;
    return ANGEL_RIDER_KEY;
  }
  const password = process.env.IANGEL_RIDER_PASSWORD || '';
  if (password && safeEqual(token, password)) return ANGEL_RIDER_KEY;
  return null;
}

export function riderKeyFromRequest(req: Request) {
  const secret = process.env.IANGEL_API_SECRET || '';
  const headerKey = req.headers.get('x-iangel-key') || '';
  if (secret && headerKey === secret) return ANGEL_RIDER_KEY;
  return readIangelRiderKey(readIangelBearer(req));
}

export async function requireIangel(req: Request) {
  if (req.method === 'OPTIONS') return iangelPreflight(req);
  if (riderKeyFromRequest(req)) return null;
  return iangelJson(req, { error: 'No autorizado' }, 401);
}
