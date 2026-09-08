import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import {
  kitchenStatusFromUber,
  parseUberWebhook,
  verifyUberSignature,
} from '@/lib/uber-webhook';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'las-vaqueras-uber-direct' });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const secret = process.env.UBER_DIRECT_WEBHOOK_SECRET || '';
  const signature =
    req.headers.get('x-uber-signature') || req.headers.get('x-postmates-signature');

  if (secret && !verifyUberSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'firma inválida' }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  const event = parseUberWebhook(payload);
  if (event.kind === 'event.courier_update') {
    return new NextResponse(null, { status: 200 });
  }

  if (!event.deliveryId && !event.orderId) {
    return new NextResponse(null, { status: 200 });
  }

  const supabase = createAdminSupabase();
  let orderQuery = supabase.from('orders').select('id, status, fulfillment_type');
  if (event.orderId) {
    orderQuery = orderQuery.eq('id', event.orderId);
  } else if (event.deliveryId) {
    orderQuery = orderQuery.eq('uber_delivery_id', event.deliveryId);
  }

  const found = await orderQuery.maybeSingle();
  if (!found.data) {
    return new NextResponse(null, { status: 200 });
  }

  const nextStatus = kitchenStatusFromUber(event.status);
  const patch: Record<string, string | null> = {
    uber_delivery_id: event.deliveryId,
    uber_status: event.status,
    uber_tracking_url: event.trackingUrl,
  };
  if (found.data.fulfillment_type === 'delivery' && nextStatus && found.data.status !== 'cancelled') {
    patch.status = nextStatus;
  }

  await supabase.from('orders').update(patch).eq('id', found.data.id);
  return new NextResponse(null, { status: 200 });
}
