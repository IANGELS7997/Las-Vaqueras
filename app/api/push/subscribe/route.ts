import { NextResponse } from 'next/server';
import { canAccessOrder } from '@/lib/order-access';
import { savePushSubscription } from '@/lib/push-vapid';
import { requireIangel } from '@/lib/iangel-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    audience?: 'rider' | 'customer';
    orderId?: string;
    token?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }
  if (body.audience === 'rider') {
    const denied = await requireIangel(req);
    if (denied) return denied;
  } else if (body.orderId && !(await canAccessOrder(body.orderId, body.token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  await savePushSubscription({
    audience: body.audience === 'rider' ? 'rider' : 'customer',
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    orderId: body.orderId || null,
  });
  return NextResponse.json({ ok: true });
}
