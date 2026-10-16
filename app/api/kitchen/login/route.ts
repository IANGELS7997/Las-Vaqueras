import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { branchByUsername } from '@/lib/branches';
import { kitchenCookieOptions, kitchenSessionToken, KITCHEN_COOKIE } from '@/lib/kitchen-auth';
import { createAdminSupabase } from '@/lib/supabase-admin';

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

  const supabase = createAdminSupabase();
  const station = await supabase
    .from('kitchen_station')
    .select('admin_enabled, session_generation')
    .eq('id', branch.stationId)
    .maybeSingle();
  if (station.error) {
    return NextResponse.json({ error: 'No se pudo entrar' }, { status: 500 });
  }
  if (station.data?.admin_enabled === false) {
    return NextResponse.json({ error: 'Cocina apagada desde administración' }, { status: 403 });
  }
  const generation = station.data?.session_generation;
  const token = await kitchenSessionToken(
    branch.id,
    typeof generation === 'number' && Number.isInteger(generation) && generation >= 0 ? generation : 0
  );
  if (!token) {
    return NextResponse.json({ error: 'Cocina no configurada' }, { status: 503 });
  }

  const response = NextResponse.json({ success: true, branch: branch.id });
  response.cookies.set(KITCHEN_COOKIE, token, kitchenCookieOptions());
  return response;
}
