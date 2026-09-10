import { NextResponse } from 'next/server';
import {
  CUSTOMER_COOKIE,
  customerCookieOptions,
  customerSessionToken,
} from '@/lib/customer-auth';
import { namesFromCheckout } from '@/lib/customer-from-checkout';
import { upsertCustomer } from '@/lib/customers';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const orderId = typeof body.orderId === 'string' ? body.orderId : '';
  const token = typeof body.token === 'string' ? body.token : '';
  if (!orderId || !token || token.length < 16) {
    return NextResponse.json({ error: 'Enlace inválido' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select('id, customer_name, customer_phone, customer_email, profile_login_token, customer_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order.data || order.data.profile_login_token !== token) {
    return NextResponse.json({ error: 'Enlace inválido o vencido' }, { status: 404 });
  }

  const { firstName, lastName } = namesFromCheckout({
    name: order.data.customer_name,
    firstName: '',
    lastName: '',
  });
  const parts = String(order.data.customer_name || '').trim().split(/\s+/);
  const first = firstName || parts[0] || 'Cliente';
  const last = lastName || parts.slice(1).join(' ') || 'Vaqueras';

  const profile = await upsertCustomer(supabase, {
    firstName: first,
    lastName: last,
    phone: order.data.customer_phone,
    email: order.data.customer_email || '',
  });

  if (!order.data.customer_id) {
    await supabase.from('orders').update({ customer_id: profile.id }).eq('id', orderId);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_COOKIE, await customerSessionToken(profile.id), customerCookieOptions());
  return response;
}
