import { NextResponse } from 'next/server';
import { branchById, orderBranchId } from '@/lib/branches';
import { sendExperienceResultNotice } from '@/lib/experience-email';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadOrder(orderId: string) {
  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select('id, status, dispatch_status, profile_login_token, short_code, customer_name, branch_id')
    .eq('id', orderId)
    .maybeSingle();
  if (order.error) throw new Error(order.error.message);
  return { supabase, order: order.data };
}

function delivered(order: { status?: string | null; dispatch_status?: string | null }) {
  return order.status === 'delivered' || order.dispatch_status === 'delivered';
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = new URL(req.url).searchParams.get('s') || '';
    const { supabase, order } = await loadOrder(params.id);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    const allowed = delivered(order) && token !== '' && token === String(order.profile_login_token || '');
    const existing = await supabase
      .from('order_experience_ratings')
      .select('stars, comment, created_at')
      .eq('order_id', params.id)
      .maybeSingle();
    if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });
    return NextResponse.json({
      canRate: allowed,
      rating: existing.data
        ? { stars: existing.data.stars, comment: existing.data.comment, createdAt: existing.data.created_at }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as { stars?: number; comment?: string; token?: string };
    const stars = Math.round(Number(body.stars));
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 400) : '';
    const token = String(body.token || '');
    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Elige de 1 a 5 estrellas' }, { status: 400 });
    }
    const { supabase, order } = await loadOrder(params.id);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (!delivered(order) || !token || token !== String(order.profile_login_token || '')) {
      return NextResponse.json({ error: 'Este enlace no puede calificar el pedido' }, { status: 400 });
    }
    const saved = await supabase
      .from('order_experience_ratings')
      .upsert({ order_id: params.id, stars, comment: comment || null }, { onConflict: 'order_id' })
      .select('stars, comment, created_at')
      .single();
    if (saved.error || !saved.data) {
      return NextResponse.json({ error: saved.error?.message || 'No se guardó' }, { status: 500 });
    }
    const code = order.short_code || params.id.replace(/-/g, '').slice(0, 4).toUpperCase();
    void sendExperienceResultNotice({
      code,
      stars,
      comment,
      customerName: String(order.customer_name || ''),
      orderId: params.id,
      branchName: branchById(orderBranchId(order.branch_id)).shortName,
    }).catch(() => undefined);
    return NextResponse.json({
      rating: { stars: saved.data.stars, comment: saved.data.comment, createdAt: saved.data.created_at },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
