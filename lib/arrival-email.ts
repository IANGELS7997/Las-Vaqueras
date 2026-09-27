const SITE = 'https://lasvaqueras.com.mx';

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

export function shouldSendArrivalEmail(input: {
  action: string;
  previousDispatch?: string | null;
  fulfillment?: string | null;
  email?: string | null;
}) {
  if (input.action !== 'arrive') return false;
  if (input.fulfillment === 'pickup') return false;
  if (String(input.previousDispatch || '') === 'arrived') return false;
  const email = String(input.email || '').trim();
  return email.includes('@');
}

export async function sendArrivalEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string | null;
  leaveAtDoor?: boolean;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to.includes('@')) return { ok: false as const };
  const track =
    `${SITE}/orders/${input.orderId}` +
    (input.token ? `?s=${encodeURIComponent(input.token)}` : '');
  const first = esc(input.customerName.trim().split(' ')[0] || '');
  const detail = input.leaveAtDoor
    ? 'Dejará el pedido en la puerta.'
    : 'Tienes 10 minutos para salir.';
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Tu repartidor llegó</h1>
<p>Hola ${first},</p>
<p>Tu repartidor ya está en tu domicilio. ${detail}</p>
<div style="text-align:center;margin:20px 0;">
<a href="${esc(track)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Ver mi pedido</a>
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
      subject: 'Tu repartidor llegó · Las Vaqueras',
      html,
      text: `Hola ${input.customerName.trim().split(' ')[0] || ''}. Tu repartidor ya está en tu domicilio. ${detail} Ver mi pedido: ${track}`,
    }),
  });
  return { ok: response.ok };
}
