import { customerHelpCopy, HELP_LABELS, type HelpKind, type HelpPay } from '@/lib/rider-help';
import { customerCopyBcc, customerMailButtons, customerMailLinksText, customerOrderUrl, escMail } from '@/lib/customer-mail';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';
import { customerRefundDecisionMail, refundRequestMail, REFUND_NOTICE_TO, type RefundNoticeInput } from '@/lib/refund-notice';

const DEVELOPER_EMAIL = 'iangels7997@gmail.com';

async function send(to: string | string[], subject: string, html: string, text: string, bcc?: string[]) {
  const key = process.env.RESEND_API_KEY || '';
  const dest = (Array.isArray(to) ? to : [to]).map((item) => item.trim()).filter(Boolean);
  if (!key || dest.length === 0) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: dest,
      ...(bcc && bcc.length > 0 ? { bcc } : {}),
      subject,
      html,
      text,
    }),
  });
}

export async function sendHelpEmails(input: {
  kind: HelpKind;
  pay: HelpPay;
  orderId: string;
  token: string | null;
  code: string | null;
  customerEmail: string | null;
  customerName: string;
  shortCode: string;
  note: string;
}) {
  const label = HELP_LABELS[input.kind];
  const orderUrl = customerOrderUrl(input.orderId, input.token);
  const summary = customerHelpCopy(input.kind, input.pay);
  const folio = input.shortCode || input.orderId.slice(0, 8);
  if (input.customerEmail) {
    const html = mailDocument({
      eyebrow: 'Ayuda',
      title: label,
      body: [
        mailParagraph(`Hola ${escMail(input.customerName || '')},`),
        mailParagraph(`<strong style="color:#111111;">${escMail(label)}</strong> · pedido #${escMail(folio)}`),
        mailParagraph(escMail(summary)),
        customerMailButtons(orderUrl),
      ].join(''),
    });
    await send(
      input.customerEmail,
      `${label} · #${folio} · Las Vaqueras`,
      html,
      `${label}\n${summary}\n${customerMailLinksText(orderUrl)}`,
      customerCopyBcc(input.customerEmail)
    );
  }
  const dev = [
    `Ayuda rider · ${label}`,
    `Pedido #${folio} · ${input.orderId}`,
    `Pago: ${input.pay}`,
    input.code ? `Código de caja: ${input.code}` : '',
    input.note ? `Nota: ${input.note}` : '',
    summary,
  ]
    .filter(Boolean)
    .join('\n');
  await send(DEVELOPER_EMAIL, `Ayuda rider · ${label} · #${folio}`, internalHtml(`Ayuda rider · #${folio}`, dev), dev);
}

export async function sendDoorReportNotice(input: { orderId: string; shortCode: string; note: string }) {
  const folio = input.shortCode || input.orderId.slice(0, 8);
  const text = `El cliente reportó que no dejaron el pedido en la puerta.\nPedido #${folio} · ${input.orderId}\n${input.note}\nEstá en Reembolsos. Si lo apruebas, se reembolsa al cliente y el rider queda debiendo el total.`;
  await send(DEVELOPER_EMAIL, `Puerta no encontrada · #${folio}`, internalHtml(`Puerta no encontrada · #${folio}`, text), text);
}

export async function sendDoorDecisionEmails(input: {
  orderId: string;
  shortCode: string;
  amount: number;
  customerEmail: string | null;
  customerName: string;
  payMethod: string;
}) {
  const folio = input.shortCode || input.orderId.slice(0, 8);
  const card = input.payMethod !== 'cash';
  const angel = [
    `No dejaron el pedido en la puerta · #${folio}`,
    `Pedido ${input.orderId}`,
    `Monto a devolver al cliente: $${input.amount}`,
    card
      ? 'El pago fue con tarjeta. Devuélvelo en Stripe. El sistema no lo reembolsa solo.'
      : 'El pago fue en efectivo. Devuelve ese monto al cliente.',
  ].join('\n');
  await send(DEVELOPER_EMAIL, `Reembolso de puerta · $${input.amount} · #${folio}`, internalHtml(`Reembolso de puerta · #${folio}`, angel), angel);
  if (input.customerEmail) {
    const text = `Aprobamos tu reporte: el pedido no estaba en la puerta. El reembolso de $${input.amount} queda en proceso.`;
    await send(
      input.customerEmail,
      `Reembolso aprobado · #${folio} · Las Vaqueras`,
      mailDocument({
        eyebrow: 'Reembolso',
        title: `Reembolso aprobado · #${folio}`,
        body: [mailParagraph(`Hola ${escMail(input.customerName || '')},`), mailParagraph(escMail(text))].join(''),
      }),
      text,
      customerCopyBcc(input.customerEmail)
    );
  }
}

function internalHtml(title: string, text: string) {
  return mailDocument({
    eyebrow: 'Aviso interno',
    title,
    body: text
      .split('\n')
      .filter(Boolean)
      .map((line) => mailParagraph(escMail(line)))
      .join(''),
  });
}

export async function sendRefundRequestNotice(input: RefundNoticeInput) {
  const mail = refundRequestMail(input);
  await send([...REFUND_NOTICE_TO], mail.subject, mail.html, mail.text);
}

export async function sendCustomerRefundDecision(input: {
  accepted: boolean;
  kind: 'stripe' | 'credit';
  amount: number;
  folio: string;
  customerName: string;
  customerEmail: string | null;
  note: string;
  orderId: string;
  token: string | null;
}) {
  const to = String(input.customerEmail || '').trim();
  if (!to.includes('@')) return;
  const mail = customerRefundDecisionMail(input);
  await send(to, mail.subject, mail.html, mail.text, customerCopyBcc(to));
}
