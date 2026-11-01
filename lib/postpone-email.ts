import { branchMailLine } from '@/lib/branches';
import {
  customerMailButtons,
  customerMailLinksText,
  customerOrderUrl,
  DEVELOPER_ORDER_COPY,
  escMail,
} from '@/lib/customer-mail';
import { purchaseNoticeLines, type PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { postponePromise } from '@/lib/postpone';

const SITE = 'https://lasvaqueras.com.mx';
const FROM = () => process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>';

export function postponeCustomerCopy(input: {
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
  sentence: string;
}) {
  const track = customerOrderUrl(input.orderId, input.token);
  const first = escMail(input.customerName.trim().split(' ')[0] || '');
  const sentence = escMail(input.sentence);
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Tu pedido tarda un poco más</h1>
<p>Hola ${first},</p>
<p>${sentence}</p>
<p>Gracias por esperarnos.</p>
${customerMailButtons(track)}
<p>${escMail(branchMailLine(input.branchId))}</p>
</div>`;
  const text = [
    `Hola ${input.customerName.trim().split(' ')[0] || ''}.`,
    input.sentence,
    'Gracias por esperarnos.',
    customerMailLinksText(track),
    branchMailLine(input.branchId),
  ].join('\n');
  return { subject: 'Tu pedido tarda un poco más · Las Vaqueras', html, text };
}

export async function sendPostponeEmails(row: PurchaseNoticeRow, delayMinutes: number) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || !row.id) return { ok: false as const, reason: 'missing' };
  const promise = postponePromise({
    fulfillment: row.fulfillment_type,
    createdAt: row.created_at,
    pickupAt: row.pickup_at,
    delayMinutes,
    branchId: row.branch_id,
    dropoffLat: row.dropoff_lat,
    dropoffLng: row.dropoff_lng,
  });
  const code = row.short_code || row.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const internal = [
    'POSPONER',
    `Cocina retrasó el pedido ${delayMinutes} minutos.`,
    promise.customerSentence,
    '',
    ...purchaseNoticeLines(row).lines,
  ];
  const internalText = internal.join('\n');
  const developer = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM(),
      to: [DEVELOPER_ORDER_COPY],
      subject: `POSPONER · #${code} · ${delayMinutes} min`,
      text: internalText,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5;">
<h1 style="font-size:22px;margin:0 0 8px;">POSPONER</h1>
${internal.map((line) => (line === '' ? '' : `<p style="margin:0 0 6px;">${escMail(line)}</p>`)).join('')}
</div>`,
    }),
  });

  const to = String(row.customer_email || '').trim();
  let customerOk = false;
  if (to.includes('@')) {
    const message = postponeCustomerCopy({
      customerName: row.customer_name || '',
      orderId: row.id,
      token: row.profile_login_token,
      branchId: row.branch_id,
      sentence: promise.customerSentence,
    });
    const customer = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM(),
        to: [to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    customerOk = customer.ok;
  }

  return { ok: developer.ok && (customerOk || !to.includes('@')), promise, developerOk: developer.ok, customerOk };
}
