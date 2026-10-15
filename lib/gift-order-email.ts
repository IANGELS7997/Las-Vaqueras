import { branchMailLine } from '@/lib/branches';
import { customerMailButtons, customerMailLinksText, customerOrderUrl, escMail } from '@/lib/customer-mail';
import { GIFT_EMAIL_ARRIVAL, GIFT_EMAIL_FINAL } from '@/lib/gift-checkout';
import { JUMBO_PRODUCT_NAME } from '@/lib/loyalty';
import { loadLoyaltyMailGuide, type LoyaltyMailGuide } from '@/lib/loyalty-mail';
import { formatMXN } from '@/lib/pricing';

export const GIFT_ORDER_SUBJECT = 'Pedido de promoción confirmado · Las Vaqueras';

export function buildGiftOrderEmail(input: {
  customerName: string;
  orderId: string;
  token?: string;
  fulfillment: 'pickup' | 'delivery';
  pickupAt?: string | null;
  totalCharged?: number;
  branchId?: unknown;
  guide?: LoyaltyMailGuide | null;
}) {
  const track = customerOrderUrl(input.orderId, input.token);
  const first = escMail(String(input.customerName || '').trim().split(/\s+/)[0] || '');
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
  const folio = input.orderId.slice(0, 8);
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="https://lasvaqueras.com.mx/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Pedido de promoción confirmado</h1>
<p>Hola ${first},</p>
<p>Canjeaste tus <strong>${escMail(JUMBO_PRODUCT_NAME)} de regalo</strong>. ${escMail(GIFT_EMAIL_ARRIVAL)}</p>
<p>${escMail(GIFT_EMAIL_FINAL)}</p>
<p style="font-weight:700;">${escMail(when)}</p>
<p>Orden #${escMail(folio)} · ${escMail(total)}</p>
${input.guide?.html || ''}
${customerMailButtons(track)}
<p>${branchMailLine(input.branchId)}</p>
</div>`;
  const text = [
    `Hola ${String(input.customerName || '').trim().split(/\s+/)[0] || ''}.`,
    `Canjeaste ${JUMBO_PRODUCT_NAME} de regalo. ${GIFT_EMAIL_ARRIVAL} ${GIFT_EMAIL_FINAL}`,
    `Pedido ${folio}. ${when} ${total}.`,
    input.guide?.text || '',
    customerMailLinksText(track),
  ]
    .filter(Boolean)
    .join('\n');
  return { subject: GIFT_ORDER_SUBJECT, html, text };
}

export async function sendGiftOrderEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string;
  fulfillment: 'pickup' | 'delivery';
  pickupAt?: string | null;
  totalCharged?: number;
  branchId?: unknown;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to) return { ok: false };
  const guide = await loadLoyaltyMailGuide({ orderId: input.orderId });
  const message = buildGiftOrderEmail({ ...input, guide });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  return { ok: response.ok };
}
