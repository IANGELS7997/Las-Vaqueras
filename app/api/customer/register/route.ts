import { NextResponse } from 'next/server';
import { CUSTOMER_COOKIE, customerCookieOptions, customerSessionToken } from '@/lib/customer-auth';
import {
  isValidCustomerEmail,
  isValidCustomerPhone,
} from '@/lib/customer-identity';
import { clientIp, lookupAllowed } from '@/lib/customer-rate-limit';
import { upsertCustomer } from '@/lib/customers';
import { getOpenStatus } from '@/lib/restaurant';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

/**
 * Alta de perfil solo con el negocio cerrado.
 * Con abierto, el perfil se crea al pagar (checkout).
 */
export async function POST(req: Request) {
  if (getOpenStatus().isOpen) {
    return NextResponse.json(
      {
        error:
          'Estamos abiertos: entra con Ver mi perfil o crea tu cuenta al pagar tu pedido.',
      },
      { status: 403 }
    );
  }

  if (!lookupAllowed(clientIp(req))) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const phoneRaw = typeof body.phone === 'string' ? body.phone : '';
  const emailRaw = typeof body.email === 'string' ? body.email : '';

  if (!firstName || !lastName || !isValidCustomerPhone(phoneRaw) || !isValidCustomerEmail(emailRaw)) {
    return NextResponse.json(
      { error: 'Escribe nombre, apellido, celular (10 dígitos) y un correo válido' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminSupabase();
    const profile = await upsertCustomer(supabase, {
      firstName,
      lastName,
      phone: phoneRaw,
      email: emailRaw,
    });

    const response = NextResponse.json({
      success: true,
      customer: {
        id: profile.id,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        email: profile.email,
      },
    });
    response.cookies.set(
      CUSTOMER_COOKIE,
      await customerSessionToken(profile.id),
      customerCookieOptions()
    );
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo crear el perfil' },
      { status: 500 }
    );
  }
}
