import { branchMailLine } from '@/lib/branches';
import { customerCopyBcc, customerMailButtons, customerMailLinksText, customerOrderUrl } from '@/lib/customer-mail';

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

export function arrivalCustomerLine(leaveAtDoor?: boolean) {
  if (leaveAtDoor) return 'Tu repartidor ha llegado a tu domicilio. Dejará el pedido en la puerta.';
  return 'Tu repartidor ha llegado a tu domicilio. Por favor, recoge tu pedido dentro de 10 minutos.';
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
  /** Pedido gestionado en cocina: llegó al domicilio, sin la espera de 10 minutos. */
  managed?: boolean;
  branchId?: unknown;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to.includes('@')) return { ok: false as const };
  const track = customerOrderUrl(input.orderId, input.token);
  const first = esc(input.customerName.trim().split(' ')[0] || '');
  const line = input.managed
    ? 'Tu repartidor ha llegado a tu domicilio.'
    : arrivalCustomerLine(input.leaveAtDoor);
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Tu repartidor llegó</h1>
<p>Hola ${first},</p>
<p>${esc(line)}</p>
${customerMailButtons(track)}
<p>${branchMailLine(input.branchId)}</p>
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
      ...(customerCopyBcc(to) ? { bcc: customerCopyBcc(to) } : {}),
      subject: 'Tu repartidor llegó · Las Vaqueras',
      html,
      text: `Hola ${input.customerName.trim().split(' ')[0] || ''}. ${line} ${customerMailLinksText(track)}`,
    }),
  });
  return { ok: response.ok };
}
