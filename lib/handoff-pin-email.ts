import { branchMailLine } from '@/lib/branches';
import {
  customerMailButtons,
  customerMailLinksText,
  customerOrderUrl,
  DEVELOPER_ORDER_COPY,
  escMail,
} from '@/lib/customer-mail';
import { purchaseNoticeLines, type PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';

const FROM = () => process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>';

export type HandoffPinSource = 'kitchen' | 'panel';

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

export function handoffPinInternalCopy(row: PurchaseNoticeRow, pin: string, source: HandoffPinSource) {
  const { code, lines } = purchaseNoticeLines(row);
  const who =
    source === 'kitchen'
      ? 'La cocina envió la clave de entrega.'
      : 'La clave se envió desde Pin a cliente.';
  const body = ['CLAVE', who, `Clave: ${pin}.`, '', ...lines];
  const text = body.join('\n');
  return {
    to: DEVELOPER_ORDER_COPY,
    subject: `CLAVE · #${code}`,
    text,
    html: mailDocument({
      eyebrow: 'Aviso interno',
      title: 'CLAVE',
      body: body.filter(Boolean).map((line) => mailParagraph(escMail(line))).join(''),
    }),
  };
}

async function postMail(key: string, payload: Record<string, unknown>) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM(), ...payload }),
  }).catch(() => null);
  return response?.ok === true;
}

export async function sendHandoffPinEmails(row: PurchaseNoticeRow, pin: string, source: HandoffPinSource) {
  const key = process.env.RESEND_API_KEY || '';
  const to = String(row.customer_email || '').trim();
  if (!key || !row.id || !isHandoffPin(pin) || !to.includes('@')) {
    return { customerOk: false, developerOk: false };
  }
  const customer = buildHandoffPinEmail({
    customerName: row.customer_name || '',
    orderId: row.id,
    token: row.profile_login_token,
    branchId: row.branch_id,
    pin,
  });
  const internal = handoffPinInternalCopy(row, pin, source);
  const [customerOk, developerOk] = await Promise.all([
    postMail(key, { to: [to], subject: customer.subject, html: customer.html, text: customer.text }),
    postMail(key, { to: [internal.to], subject: internal.subject, html: internal.html, text: internal.text }),
  ]);
  return { customerOk, developerOk };
}
