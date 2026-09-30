const SITE = 'https://lasvaqueras.com.mx';

export const UBER_TRACK_SUBJECT = 'Sigue tu pedido con Uber Direct · Las Vaqueras';
export const UBER_TRACK_LINE = 'Tu envío va con Uber Direct. Desde este enlace ves al repartidor.';

function esc(value: unknown) {
  return String(value == null ? '' : value)
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;');
}

/** Solo un enlace http(s). Cualquier otro texto no se usa como seguimiento. */
export function uberTrackingHref(value: unknown) {
  const text = String(value || '').trim();
  if (text.startsWith('https://') || text.startsWith('http://')) return text;
  return null;
}

/** Un solo correo: la primera vez que el pedido recibe enlace de Uber. */
export function shouldSendUberTrackingEmail(input: {
  previousUrl?: string | null;
  nextUrl?: string | null;
  email?: string | null;
}) {
  if (uberTrackingHref(input.previousUrl)) return false;
  if (!uberTrackingHref(input.nextUrl)) return false;
  return String(input.email || '').trim().includes('@');
}

export async function sendUberTrackingEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  trackingUrl: string;
  token?: string | null;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  const tracking = uberTrackingHref(input.trackingUrl);
  if (!key || !to.includes('@') || !tracking) return { ok: false as const };
  const orderUrl =
    `${SITE}/orders/${input.orderId}` +
    (input.token ? `?s=${encodeURIComponent(input.token)}` : '');
  const first = esc(input.customerName.trim().split(' ')[0] || '');
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Sigue tu pedido</h1>
<p>Hola ${first},</p>
<p>${esc(UBER_TRACK_LINE)}</p>
<div style="text-align:center;margin:20px 0;">
<a href="${esc(tracking)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Seguir con Uber Direct</a>
</div>
<div style="text-align:center;margin:0 0 20px;">
<a href="${esc(orderUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Ver mi pedido</a>
</div>
<p>Las Vaqueras<br/>Rio de Janeiro 903, Panamericana, Chihuahua</p>
</div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
      subject: UBER_TRACK_SUBJECT,
      html,
      text: `Hola ${input.customerName.trim().split(' ')[0] || ''}. ${UBER_TRACK_LINE} ${tracking}`,
    }),
  });
  return { ok: response.ok };
}
