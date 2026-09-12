import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { clientIp as requestIp, lookupAllowed } from '@/lib/customer-rate-limit';
import {
  getAvailableJumboReward,
  jumboRedeemCookieOptions,
  JUMBO_REDEEM_COOKIE,
  rewardMatchesCode,
  signRedeemCookie,
} from '@/lib/loyalty-reward';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!lookupAllowed(requestIp(req))) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
  }

  const customerId = await readCustomerIdFromRequest();
  if (!customerId) {
    return NextResponse.json({ error: 'Entra a tu perfil para canjear' }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const profile = await supabase.from('customers').select('id, phone').eq('id', customerId).maybeSingle();
  if (!profile.data) {
    return NextResponse.json({ error: 'No encontramos tu perfil' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const typedCode = typeof body.code === 'string' ? body.code : '';

  const reward = await getAvailableJumboReward(supabase, customerId);
  if (!reward) {
    return NextResponse.json({ error: 'No tienes Papas Jumbo pendientes de canje' }, { status: 404 });
  }
  if (typedCode && !(await rewardMatchesCode(reward, typedCode))) {
    return NextResponse.json({ error: 'El código no corresponde a tu perfil' }, { status: 403 });
  }

  const token = await signRedeemCookie(reward.id, customerId);
  const response = NextResponse.json({
    ok: true,
    rewardId: reward.id,
    label: 'Papas Jumbo de regalo listas para pedir',
  });
  response.cookies.set(JUMBO_REDEEM_COOKIE, token, jumboRedeemCookieOptions());
  return response;
}
