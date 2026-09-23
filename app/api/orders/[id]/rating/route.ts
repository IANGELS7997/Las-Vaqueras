import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const SELF_PROVIDERS = new Set(['self', 'wait_self']);

async function loadDeliveredSelfOrder(orderId: string) {
  const supabase = createAdminSupabase();
  const order = await supabase
    .from('orders')
    .select('id, status, dispatch_status, delivery_provider, short_code, customer_name')
    .eq('id', orderId)
    .maybeSingle();
  if (order.error) throw new Error(order.error.message);
  return { supabase, order: order.data };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, order } = await loadDeliveredSelfOrder(params.id);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const existing = await supabase
      .from('order_ratings')
      .select('id, stars, comment, created_at')
      .eq('order_id', params.id)
      .eq('direction', 'customer_to_rider')
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }

    const canRate =
      SELF_PROVIDERS.has(String(order.delivery_provider || '')) &&
      (order.status === 'delivered' || order.dispatch_status === 'delivered');

    return NextResponse.json({
      canRate,
      rating: existing.data
        ? {
            stars: existing.data.stars,
            comment: existing.data.comment,
            createdAt: existing.data.created_at,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await req.json().catch(() => ({}))) as { stars?: number; comment?: string };
    const stars = Math.round(Number(body.stars));
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 400) : '';

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Elige de 1 a 5 estrellas' }, { status: 400 });
    }

    const { supabase, order } = await loadDeliveredSelfOrder(params.id);
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

    const canRate =
      SELF_PROVIDERS.has(String(order.delivery_provider || '')) &&
      (order.status === 'delivered' || order.dispatch_status === 'delivered');
    if (!canRate) {
      return NextResponse.json({ error: 'Solo puedes calificar entregas IANGEL completadas' }, { status: 400 });
    }

    const upserted = await supabase
      .from('order_ratings')
      .upsert(
        {
          order_id: params.id,
          direction: 'customer_to_rider',
          stars,
          comment: comment || null,
        },
        { onConflict: 'order_id,direction' }
      )
      .select('id, stars, comment, created_at')
      .single();

    if (upserted.error) {
      return NextResponse.json({ error: upserted.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      rating: {
        stars: upserted.data.stars,
        comment: upserted.data.comment,
        createdAt: upserted.data.created_at,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
