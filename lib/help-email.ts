import { customerHelpCopy, HELP_LABELS, type HelpKind, type HelpPay } from '@/lib/rider-help';
import { customerMailButtons, customerMailLinksText, customerOrderUrl, escMail } from '@/lib/customer-mail';

const DEVELOPER_EMAIL = 'iangels7997@gmail.com';

async function send(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
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
    const html = `<div style="font-family:sans-serif;line-height:1.5">
<p>Hola ${escMail(input.customerName || '')},</p>
<p><strong>${escMail(label)}</strong> · pedido #${escMail(folio)}</p>
<p>${escMail(summary)}</p>
${customerMailButtons(orderUrl)}
</div>`;
    await send(
      input.customerEmail,
      `${label} · #${folio} · Las Vaqueras`,
      html,
      `${label}\n${summary}\n${customerMailLinksText(orderUrl)}`
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
  await send(DEVELOPER_EMAIL, `Ayuda rider · ${label} · #${folio}`, `<pre>${escMail(dev)}</pre>`, dev);
}
