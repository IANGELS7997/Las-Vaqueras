import { NextResponse } from 'next/server';
import {
  kitchenCookieOptions,
  kitchenSessionToken,
  KITCHEN_COOKIE,
} from '@/lib/kitchen-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.KITCHEN_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: 'Cocina no configurada' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== secret) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(KITCHEN_COOKIE, await kitchenSessionToken(secret), kitchenCookieOptions());
  return response;
}
