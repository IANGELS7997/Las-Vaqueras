import { NextResponse } from 'next/server';
import { CUSTOMER_COOKIE, customerCookieOptions, customerSessionToken } from '@/lib/customer-auth';
import { isValidCustomerPhone, normalizeNameKey, normalizePhone } from '@/lib/customer-identity';
import { clientIp, lookupAllowed } from '@/lib/customer-rate-limit';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!lookupAllowed(clientIp(req))) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === 'string' ? body.firstName : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone : '';

  if (!firstName.trim() || !lastName.trim() || !isValidCustomerPhone(phoneRaw)) {
    return NextResponse.json({ error: 'Escribe nombre, apellido y celular' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const found = await supabase
    .from('customers')
    .select('id')
    .eq('phone', normalizePhone(phoneRaw))
    .eq('first_name_key', normalizeNameKey(firstName))
    .eq('last_name_key', normalizeNameKey(lastName))
    .maybeSingle();

  if (!found.data) {
    return NextResponse.json({ error: 'No encontramos un perfil con esos datos' }, { status: 404 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(
    CUSTOMER_COOKIE,
    await customerSessionToken(found.data.id),
    customerCookieOptions()
  );
  return response;
}
