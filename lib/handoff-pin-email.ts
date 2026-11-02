import { branchMailLine } from '@/lib/branches';
import { customerMailButtons, customerMailLinksText, customerOrderUrl, escMail } from '@/lib/customer-mail';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';

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
  const html = mailDocument({
    eyebrow: 'Entrega',
    title: 'Tu clave de entrega',
    body: [
      mailParagraph(`Hola ${first},`),
      `<p style="margin:0 0 16px;text-align:center;">Tu clave para recibir este pedido es</p>`,
      `<p style="margin:0 0 16px;text-align:center;font-size:32px;line-height:1;letter-spacing:8px;font-weight:700;color:#111111;">${pin}</p>`,
      `<p style="margin:0 0 16px;text-align:center;">Dísela a la persona que te entregue el pedido.</p>`,
      customerMailButtons(track),
    ].join(''),
    footer: branchMailLine(input.branchId),
  });
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
