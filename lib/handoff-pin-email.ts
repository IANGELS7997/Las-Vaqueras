import { branchMailLine } from '@/lib/branches';
import { customerMailButtons, customerMailLinksText, customerOrderUrl, escMail } from '@/lib/customer-mail';

const SITE = 'https://lasvaqueras.com.mx';

export function isHandoffPin(value: string) {
  return /^\d{4}$/.test(value);
}

export function buildHandoffPinEmail(input: {
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
  pin: string;
}) {
  const track = customerOrderUrl(input.orderId, input.token);
  const first = escMail(input.customerName.trim().split(' ')[0] || '');
  const pin = escMail(input.pin);
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Tu clave de entrega</h1>
<p>Hola ${first},</p>
<p>Tu clave para recibir este pedido es <strong style="font-size:22px;letter-spacing:4px;">${pin}</strong>.</p>
<p>Dísela a la persona que te entregue el pedido.</p>
${customerMailButtons(track)}
<p>${escMail(branchMailLine(input.branchId))}</p>
</div>`;
  const text = [
    `Hola ${input.customerName.trim().split(' ')[0] || ''}.`,
    `Tu clave para recibir este pedido es ${input.pin}.`,
    'Dísela a la persona que te entregue el pedido.',
    customerMailLinksText(track),
    branchMailLine(input.branchId),
  ].join('\n');
  return { subject: 'Tu clave de entrega · Las Vaqueras', html, text };
}

export async function sendHandoffPinEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
  pin: string;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to.includes('@') || !isHandoffPin(input.pin)) return { ok: false as const };
  const message = buildHandoffPinEmail(input);
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
