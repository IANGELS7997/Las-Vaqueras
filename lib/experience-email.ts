import { branchMailLine } from '@/lib/branches';
import {
  customerCopyBcc,
  customerMailButtons,
  customerMailLinksText,
  customerOrderUrl,
  DEVELOPER_ORDER_COPY,
  escMail,
} from '@/lib/customer-mail';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';

export const EXPERIENCE_SUBJECT = 'Califica tu experiencia · Las Vaqueras';

/** Desde que sale el ticket, no desde la entrega. */
export const EXPERIENCE_WAIT_MS = 85 * 60 * 1000;

export function experienceEmailDue(ticketSentAt: string | null | undefined, nowMs: number) {
  if (!ticketSentAt) return false;
  const sentAt = new Date(ticketSentAt).getTime();
  if (!Number.isFinite(sentAt)) return false;
  return sentAt <= nowMs - EXPERIENCE_WAIT_MS;
}

function starLinks(orderUrl: string) {
  const stars = [1, 2, 3, 4, 5]
    .map((star) => {
      const href = escMail(`${orderUrl}${orderUrl.includes('?') ? '&' : '?'}estrellas=${star}`);
      return `<a href="${href}" style="color:#f97316;text-decoration:none;font-size:32px;margin:0 4px;" aria-label="${star} estrellas">★</a>`;
    })
    .join('');
  return `<p style="text-align:center;margin:18px 0 8px;">${stars}</p>
<p style="text-align:center;margin:0 0 8px;">Elige una estrella. En la página puedes dejar un comentario.</p>`;
}

export function buildExperienceEmail(input: {
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
}) {
  const track = customerOrderUrl(input.orderId, input.token);
  const first = escMail(input.customerName.trim().split(' ')[0] || '');
  const html = mailDocument({
    title: 'Califica tu experiencia',
    body: [
      mailParagraph(`Hola ${first},`),
      mailParagraph('Ya pasó un rato desde que recibiste tu pedido. Nos ayuda mucho saber cómo te fue, del 1 al 5.'),
      starLinks(track),
      customerMailButtons(track),
    ].join(''),
    footer: branchMailLine(input.branchId),
  });
  const text = [
    `Hola ${input.customerName.trim().split(' ')[0] || ''}.`,
    'Califica tu experiencia. Elige del 1 al 5. En la página puedes dejar un comentario.',
    ...[1, 2, 3, 4, 5].map(
      (star) => `${star} estrellas: ${track}${track.includes('?') ? '&' : '?'}estrellas=${star}`
    ),
    customerMailLinksText(track),
    branchMailLine(input.branchId),
  ].join('\n');
  return { subject: EXPERIENCE_SUBJECT, html, text };
}

export async function sendExperienceEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to.includes('@')) return { ok: false as const, reason: 'missing' };
  const message = buildExperienceEmail(input);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
      bcc: customerCopyBcc(to),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  return { ok: response.ok, reason: response.ok ? 'sent' : 'resend' };
}

export async function sendExperienceResultNotice(input: {
  code: string;
  stars: number;
  comment: string;
  customerName: string;
  orderId: string;
  branchName: string;
}) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key) return { ok: false as const };
  const comment = input.comment.trim() || 'Sin comentario';
  const lines = [
    `Calificación: ${input.stars} de 5.`,
    `Comentario: ${comment}`,
    `Pedido #${input.code}.`,
    `Cliente: ${input.customerName || 'Sin nombre'}.`,
    `Sucursal: ${input.branchName}.`,
    `Número de pedido: ${input.orderId}.`,
  ];
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [DEVELOPER_ORDER_COPY],
      subject: `Calificación · #${input.code} · ${input.stars} estrellas`,
      text: lines.join('\n'),
      html: mailDocument({
        eyebrow: 'Aviso interno',
        title: `Calificación · #${input.code}`,
        body: lines.map((line) => mailParagraph(escMail(line))).join(''),
      }),
    }),
  });
  return { ok: response.ok };
}
