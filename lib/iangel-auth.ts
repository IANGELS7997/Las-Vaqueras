import { NextResponse } from 'next/server';

export const IANGEL_LOCAL_TOKEN = 'iangel-local';

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

export function isIangelLocalDemo(req: Request) {
  return readIangelBearer(req) === IANGEL_LOCAL_TOKEN;
}

export async function requireIangel(req: Request) {
  if (req.method === 'OPTIONS') return iangelPreflight(req);
  if (isIangelLocalDemo(req)) return null;
  const secret = process.env.IANGEL_API_SECRET || '';
  const headerKey = req.headers.get('x-iangel-key') || '';
  if (secret && headerKey === secret) return null;
  const password = process.env.IANGEL_RIDER_PASSWORD || '';
  const bearer = readIangelBearer(req);
  if (password && bearer && bearer === password) return null;
  return iangelJson(req, { error: 'No autorizado' }, 401);
}

export function isTestOrderRow(row: Record<string, unknown>) {
  const payload = row.n8n_payload;
  if (payload && typeof payload === 'object' && (payload as { test?: boolean }).test === true) return true;
  const code = String(row.short_code || '');
  return code.startsWith('PRUE') || code.startsWith('SYN');
}
