import { escMail, customerMailButtons, customerMailLinksText, customerOrderUrl } from '@/lib/customer-mail';
import { formatMXN } from '@/lib/pricing';
import type { CartItem } from '@/types';

export const REFUND_NOTICE_TO = ['iangels7997@gmail.com', 'servicio@lasvaqueras.com.mx'] as const;

export type RefundNoticeInput = {
  orderId: string;
  folio: string;
  branch: string;
  customerName: string;
  customerPhone: string;
  payLabel: string;
  amount: number;
  reason: string;
  note: string;
  items: CartItem[] | null | undefined;
  foodPhotoUrl: string;
  ticketPhotoUrl: string;
};

function itemLines(items: CartItem[] | null | undefined) {
  if (!Array.isArray(items) || items.length === 0) return 'Sin platillos';
  return items
    .map((item) => {
      const qty = Number(item?.quantity || 1);
      const name = String(item?.name || 'Platillo');
      const extras = (item?.extras || []).map((extra) => extra.name).filter(Boolean);
      const note = item?.specialInstructions ? ` (${item.specialInstructions})` : '';
      const extra = extras.length > 0 ? ` + ${extras.join(', ')}` : '';
      return `${Number.isFinite(qty) && qty > 0 ? qty : 1}× ${name}${extra}${note}`;
    })
    .join('\n');
}

function photoLine(label: string, url: string) {
  return url ? `${label}: ${url}` : `${label}: sin enlace`;
}

function photoLink(label: string, url: string) {
  if (!url) return `${escMail(label)}: sin enlace`;
  return `<a href="${escMail(url)}">${escMail(label)}</a>`;
}

export function refundRequestMail(input: RefundNoticeInput) {
  const money = formatMXN(input.amount);
  const dishes = itemLines(input.items);
  const subject = `Solicitud de reembolso · #${input.folio} · ${input.branch}`;
  const text = [
    `Solicitud de reembolso #${input.folio}`,
    `Sucursal: ${input.branch}`,
    `Cliente: ${input.customerName}`,
    `Teléfono: ${input.customerPhone}`,
    `Pago: ${input.payLabel}`,
    `Monto: ${money}`,
    `Motivo: ${input.reason}`,
    `Descripción: ${input.note}`,
    'Platillos:',
    dishes,
    photoLine('Foto de la comida', input.foodPhotoUrl),
    photoLine('Foto del ticket', input.ticketPhotoUrl),
    `Pedido: ${input.orderId}`,
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.45;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#9a3412;">Solicitud de reembolso</p>
<h1 style="font-size:22px;margin:0 0 12px;">#${escMail(input.folio)} · ${escMail(input.branch)}</h1>
<p><strong>Cliente:</strong> ${escMail(input.customerName)}<br/>
<strong>Teléfono:</strong> ${escMail(input.customerPhone)}<br/>
<strong>Pago:</strong> ${escMail(input.payLabel)}<br/>
<strong>Monto:</strong> ${escMail(money)}</p>
<p><strong>Motivo:</strong> ${escMail(input.reason)}<br/>
<strong>Descripción:</strong> ${escMail(input.note)}</p>
<p><strong>Platillos</strong><br/>${escMail(dishes).split('\n').join('<br/>')}</p>
<p>${photoLink('Foto de la comida', input.foodPhotoUrl)}<br/>
${photoLink('Foto del ticket', input.ticketPhotoUrl)}</p>
<p>Pedido ${escMail(input.orderId)}</p>
</div>`;
  return { subject, html, text };
}

export function customerRefundDecisionMail(input: {
  accepted: boolean;
  kind: 'stripe' | 'credit';
  amount: number;
  folio: string;
  customerName: string;
  note: string;
  orderId: string;
  token: string | null;
}) {
  const money = formatMXN(input.amount);
  const orderUrl = customerOrderUrl(input.orderId, input.token);
  const body = input.accepted
    ? input.kind === 'stripe'
      ? `Aceptamos tu solicitud. ${money} vuelven a tu tarjeta.`
      : `Aceptamos tu solicitud. ${money} de comida y envío quedan en tu próxima compra.`
    : `No se aprobó el reembolso.${input.note ? ` ${input.note}` : ''}`;
  const subject = `${input.accepted ? 'Reembolso aceptado' : 'Reembolso no aprobado'} · #${input.folio} · Las Vaqueras`;
  const html = `<div style="font-family:sans-serif;line-height:1.5">
<p>Hola ${escMail(input.customerName || '')},</p>
<p>${escMail(body)}</p>
<p>Pedido #${escMail(input.folio)}</p>
${customerMailButtons(orderUrl)}
</div>`;
  const text = `${body}\nPedido #${input.folio}\n${customerMailLinksText(orderUrl)}`;
  return { subject, html, text };
}
