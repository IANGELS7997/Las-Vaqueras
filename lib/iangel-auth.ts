import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

const TOKEN_PREFIX = 'iangel.v1.';

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

export function issueIangelToken() {
  const secret = tokenSecret();
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const body = String(exp);
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return `${TOKEN_PREFIX}${body}.${sig}`;
}

export function verifyIangelToken(token: string) {
  const secret = tokenSecret();
  if (!secret || !token.startsWith(TOKEN_PREFIX)) return false;
  const rest = token.slice(TOKEN_PREFIX.length);
  const dot = rest.lastIndexOf('.');
  if (dot < 0) return false;
  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  if (!safeEqual(expected, sig)) return false;
  const exp = Number(body);
  return Number.isFinite(exp) && Date.now() < exp;
}

export async function requireIangel(req: Request) {
  if (req.method === 'OPTIONS') return iangelPreflight(req);
  const secret = process.env.IANGEL_API_SECRET || '';
  const headerKey = req.headers.get('x-iangel-key') || '';
  if (secret && headerKey === secret) return null;
  const bearer = readIangelBearer(req);
  if (verifyIangelToken(bearer)) return null;
  const password = process.env.IANGEL_RIDER_PASSWORD || '';
  if (password && bearer && safeEqual(bearer, password)) return null;
  return iangelJson(req, { error: 'No autorizado' }, 401);
}
