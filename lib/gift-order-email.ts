import { GIFT_EMAIL_ARRIVAL, GIFT_EMAIL_FINAL } from '@/lib/gift-checkout';
import { JUMBO_PRODUCT_NAME } from '@/lib/loyalty';
import { formatMXN } from '@/lib/pricing';

export async function sendGiftOrderEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string;
  fulfillment: 'pickup' | 'delivery';
  pickupAt?: string | null;
  totalCharged?: number;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to) return { ok: false };
  const track =
    `https://lasvaqueras.com.mx/orders/${input.orderId}` +
    (input.token ? `?s=${encodeURIComponent(input.token)}` : '');
  const when =
    input.fulfillment === 'pickup' && input.pickupAt
      ? `Recoger en tienda · ${new Date(input.pickupAt).toLocaleString('es-MX', {
          timeZone: 'America/Chihuahua',
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })}`
      : 'A domicilio. Te llegará pronto.';
  const total = formatMXN(Number(input.totalCharged || 0));
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="https://lasvaqueras.com.mx/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Pedido de promoción confirmado</h1>
<p>Hola ${input.customerName.split(' ')[0] || ''},</p>
<p>Canjeaste tus <strong>${JUMBO_PRODUCT_NAME} de regalo</strong>. ${GIFT_EMAIL_ARRIVAL}</p>
<p>${GIFT_EMAIL_FINAL}</p>
<p style="font-weight:700;">${when}</p>
<p>Orden #${input.orderId.slice(0, 8)} · ${total}</p>
<div style="text-align:center;margin:20px 0;">
<a href="${track}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">Ver mi pedido</a>
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
      subject: 'Pedido de promoción confirmado · Las Vaqueras',
      html,
      text: `Canjeaste ${JUMBO_PRODUCT_NAME} de regalo. ${GIFT_EMAIL_ARRIVAL} ${GIFT_EMAIL_FINAL} Pedido ${input.orderId.slice(0, 8)}. ${when} ${total}. Ver: ${track}`,
    }),
  });
  return { ok: response.ok };
}
