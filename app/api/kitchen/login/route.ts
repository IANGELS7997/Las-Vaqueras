import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { branchByUsername } from '@/lib/branches';
import { kitchenCookieOptions, kitchenSessionToken, KITCHEN_COOKIE } from '@/lib/kitchen-auth';

export const runtime = 'nodejs';

function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const branch = branchByUsername(typeof body.username === 'string' ? body.username : '');
  const password = typeof body.password === 'string' ? body.password : '';
  const expected = branch ? process.env[branch.passwordEnv] || '' : '';
  if (branch && !expected) {
    return NextResponse.json({ error: 'Cocina no configurada' }, { status: 503 });
  }
  if (!branch || !sameSecret(password, expected)) {
    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });
  }

  const token = await kitchenSessionToken(branch.id);
  if (!token) {
    return NextResponse.json({ error: 'Cocina no configurada' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true, branch: branch.id });
  response.cookies.set(KITCHEN_COOKIE, token, kitchenCookieOptions());
  return response;
}
