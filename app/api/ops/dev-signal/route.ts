import { NextResponse } from 'next/server';
import { iangelAllowedOrigins } from '@/lib/iangel-auth';
import { decideDevSignal, forwardDevSignal, type DevSignalInput } from '@/lib/dev-signal';

export const runtime = 'nodejs';

const STORE_ORIGINS = [
  'https://lasvaqueras.com.mx',
  'https://www.lasvaqueras.com.mx',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowed = new Set([...iangelAllowedOrigins(), ...STORE_ORIGINS]);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '';
}

export function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: Request) {
  const headers = corsHeaders(req);
  let input: DevSignalInput = {};
  try {
    const body = await req.json();
    if (body && typeof body === 'object') input = body as DevSignalInput;
  } catch {
    return NextResponse.json({ ok: true, ignored: 'json' }, { headers });
  }

  const decision = decideDevSignal(input, {
    userAgent: req.headers.get('user-agent') || '',
    ip: clientIp(req),
  });
  if (decision.forward && decision.payload) {
    await forwardDevSignal(decision.payload);
  }
  return NextResponse.json(
    { ok: true, ignored: decision.forward ? undefined : decision.reason },
    { headers }
  );
}
