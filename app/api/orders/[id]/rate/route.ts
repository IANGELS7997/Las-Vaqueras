import { NextResponse } from 'next/server';
import { RATING_WINDOW_MS } from '@/lib/iangel-constants';
import { canAccessOrder } from '@/lib/order-access';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as {
    token?: string;
    stars?: number;
    comment?: string;
  };
  if (!(await canAccessOrder(params.id, body.token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: 'Califica del 1 al 5' }, { status: 400 });
  }
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('orders')
    .select('status, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();
  if (!data || !['delivered', 'delivered_unclaimed'].includes(data.status)) {
    return NextResponse.json({ error: 'Solo puedes calificar después de la entrega' }, { status: 400 });
  }
  const stamp = data.created_at;
  if (Date.now() - new Date(stamp).getTime() > RATING_WINDOW_MS * 2) {
    return NextResponse.json({ error: 'La ventana de 24 h para calificar ya cerró' }, { status: 400 });
  }
  const inserted = await supabase.from('order_ratings').upsert({
    order_id: params.id,
    direction: 'customer_to_rider',
    stars,
    comment: String(body.comment || '').slice(0, 500) || null,
  });
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, private: true });
}
