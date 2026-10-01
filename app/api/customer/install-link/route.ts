import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { customerInstallPath } from '@/lib/customer-mail';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const customerId = await readCustomerIdFromRequest();
  if (!customerId) {
    return NextResponse.json({ error: 'Entra a tu perfil' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  if (!/^[0-9a-f-]{8,80}$/i.test(orderId)) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select('id, customer_id, profile_login_token')
    .eq('id', orderId)
    .maybeSingle();

  const token = String(order.data?.profile_login_token || '');
  if (!order.data || order.data.customer_id !== customerId || !/^[0-9a-f]{16,64}$/i.test(token)) {
    return NextResponse.json({ error: 'Pedido inválido' }, { status: 404 });
  }

  return NextResponse.json({ path: customerInstallPath(orderId, token) });
}
