import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendUberTrackingEmail, shouldSendUberTrackingEmail } from '@/lib/uber-tracking-email';
import {
  isUberIgnoredMoneyEvent,
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
  if (isUberIgnoredMoneyEvent(event.kind)) {
    return new NextResponse(null, { status: 200 });
  }

  if (!event.deliveryId && !event.orderId) {
    return new NextResponse(null, { status: 200 });
  }

  const supabase = createAdminSupabase();
  let orderQuery = supabase
    .from('orders')
    .select('id, status, fulfillment_type, customer_email, customer_name, uber_tracking_url, profile_login_token');
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
  const previousUrl = found.data.uber_tracking_url;
  const patch: Record<string, string | number | null> = {
    uber_status: event.status,
  };
  if (event.deliveryId) patch.uber_delivery_id = event.deliveryId;
  if (event.trackingUrl) patch.uber_tracking_url = event.trackingUrl;
  if (event.courierLat != null && event.courierLng != null) {
    patch.rider_lat = event.courierLat;
    patch.rider_lng = event.courierLng;
  }
  if (found.data.fulfillment_type === 'delivery' && nextStatus && found.data.status !== 'cancelled') {
    patch.status = nextStatus;
  }

  const saved = await supabase.from('orders').update(patch).eq('id', found.data.id);
  if (
    !saved.error &&
    shouldSendUberTrackingEmail({
      previousUrl,
      nextUrl: event.trackingUrl,
      email: found.data.customer_email,
    })
  ) {
    void sendUberTrackingEmail({
      to: String(found.data.customer_email || ''),
      customerName: String(found.data.customer_name || ''),
      orderId: found.data.id,
      trackingUrl: String(event.trackingUrl || ''),
      token: found.data.profile_login_token,
    }).catch((err) => Sentry.captureException(err));
  }
  return new NextResponse(null, { status: 200 });
}
