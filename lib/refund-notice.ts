import { escMail, customerMailButtons, customerMailLinksText, customerOrderUrl } from '@/lib/customer-mail';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';
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
  return `<a href="${escMail(url)}" style="color:#f97316;text-decoration:none;">${escMail(label)}</a>`;
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
  const html = mailDocument({
    eyebrow: 'Solicitud de reembolso',
    title: `#${input.folio} · ${input.branch}`,
    body: [
      mailParagraph(`<strong style="color:#111111;">Cliente:</strong> ${escMail(input.customerName)}<br/><strong style="color:#111111;">Teléfono:</strong> ${escMail(input.customerPhone)}<br/><strong style="color:#111111;">Pago:</strong> ${escMail(input.payLabel)}<br/><strong style="color:#111111;">Monto:</strong> ${escMail(money)}`),
      mailParagraph(`<strong style="color:#111111;">Motivo:</strong> ${escMail(input.reason)}<br/><strong style="color:#111111;">Descripción:</strong> ${escMail(input.note)}`),
      mailParagraph(`<strong style="color:#111111;">Platillos</strong><br/>${escMail(dishes).split('\n').join('<br/>')}`),
      mailParagraph(`${photoLink('Foto de la comida', input.foodPhotoUrl)}<br/>${photoLink('Foto del ticket', input.ticketPhotoUrl)}`),
      mailParagraph(`Pedido ${escMail(input.orderId)}`),
    ].join(''),
  });
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
  const html = mailDocument({
    eyebrow: 'Reembolso',
    title: input.accepted ? 'Reembolso aceptado' : 'Reembolso no aprobado',
    body: [
      mailParagraph(`Hola ${escMail(input.customerName || '')},`),
      mailParagraph(escMail(body)),
      mailParagraph(`Pedido #${escMail(input.folio)}`),
      customerMailButtons(orderUrl),
    ].join(''),
  });
  const text = `${body}\nPedido #${input.folio}\n${customerMailLinksText(orderUrl)}`;
  return { subject, html, text };
}
