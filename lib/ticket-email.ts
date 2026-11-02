import { branchMailLine, orderBranchId } from '@/lib/branches';
import type { CartItem } from '@/types';
import { billingMailButton, billingMailText } from '@/lib/billing-form';
import { customerMailButtons, customerMailLinksText, customerOrderUrl, escMail, INSTALL_APP_REMINDER } from '@/lib/customer-mail';
import { loadLoyaltyMailGuide, type LoyaltyMailGuide } from '@/lib/loyalty-mail';
import { DELIVERY_ETA_MAIL } from '@/lib/iangel-copy';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';
import { formatMXN } from '@/lib/pricing';
import type { DbOrderRow } from '@/lib/orders-map';

export type TicketOrder = DbOrderRow & {
  profile_login_token?: string | null;
};

function money(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return formatMXN(Number.isFinite(amount) ? amount : 0);
}

function itemLines(items: CartItem[] | null | undefined) {
  if (!Array.isArray(items) || items.length === 0) return '<li>Sin platillos</li>';
  return items
    .map((item) => {
      const name = escMail(item?.name || 'Platillo');
      const qty = Number(item?.quantity || 1);
      const extras = Array.isArray(item?.extras) ? item.extras.map((extra) => extra?.name).filter(Boolean) : [];
      const extraText = extras.length > 0 ? ` + ${escMail(extras.join(', '))}` : '';
      const removals = Array.isArray(item?.removals) && item.removals.length > 0 ? ` Sin ${escMail(item.removals.join(', '))}` : '';
      const note = item?.specialInstructions ? ` (${escMail(item.specialInstructions)})` : '';
      const count = Number.isFinite(qty) && qty > 0 ? qty : 1;
      return `<li>${count}× ${name}${extraText}${removals}${note}</li>`;
    })
    .join('');
}

function whenLine(row: TicketOrder) {
  if ((row.fulfillment_type || '') === 'pickup') {
    const at = row.pickup_at
      ? new Date(row.pickup_at).toLocaleString('es-MX', {
          timeZone: 'America/Chihuahua',
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
    return at ? `Tu pedido estará listo el ${at}.` : 'Recoger en tienda';
  }
  return row.delivery_address ? `A domicilio · ${row.delivery_address}` : 'A domicilio';
}

export const PURCHASE_THANKS = 'Gracias por tu compra. En Las Vaqueras preparamos tu pedido con gusto.';
export { INSTALL_APP_REMINDER };

export function buildTicketEmail(row: TicketOrder, guide?: LoyaltyMailGuide | null) {
  const code = row.short_code || row.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const first = String(row.customer_name || '').trim().split(/\s+/)[0] || '';
  const orderUrl = customerOrderUrl(row.id, row.profile_login_token);
  const place = whenLine(row);
  const eta = (row.fulfillment_type || '') === 'pickup' ? '' : DELIVERY_ETA_MAIL;
  const delivery = Number(row.delivery_fee || 0);
  const service = Number(row.customer_fee || 0);
  const html = mailDocument({
    eyebrow: 'Pedido confirmado',
    title: `Tu ticket · #${code}`,
    body: [
      mailParagraph(`Hola ${escMail(first)},`),
      mailParagraph(escMail(PURCHASE_THANKS)),
      mailParagraph('Recibimos tu pedido. Venta final: no admite cancelación ni devolución.'),
      mailParagraph(escMail(place), true),
      eta ? mailParagraph(escMail(eta)) : '',
      `<ul style="margin:0 0 16px;padding:0 0 0 18px;">${itemLines(row.items)}</ul>`,
      mailParagraph(`<strong style="color:#111111;">Total:</strong> ${escMail(money(row.total_charged))}`),
      delivery > 0 ? mailParagraph(`Envío: ${escMail(money(delivery))}`) : '',
      service > 0 ? mailParagraph(`Cuota de servicio: ${escMail(money(service))}`) : '',
      guide?.html || '',
      mailParagraph(escMail(INSTALL_APP_REMINDER)),
      customerMailButtons(orderUrl),
      billingMailButton(),
    ].join(''),
    footer: branchMailLine(orderBranchId(row.branch_id)),
  });
  const text = [
    `Tu ticket #${code}`,
    `Hola ${first}.`,
    PURCHASE_THANKS,
    'Recibimos tu pedido. Venta final: no admite cancelación ni devolución.',
    place,
    eta,
    `Total ${money(row.total_charged)}`,
    guide?.text || '',
    INSTALL_APP_REMINDER,
    customerMailLinksText(orderUrl),
    billingMailText(),
  ]
    .filter(Boolean)
    .join('\n');
  return {
    subject: `Tu ticket · #${code} · Las Vaqueras`,
    html,
    text,
  };
}

export async function sendCustomerTicket(row: TicketOrder) {
  const key = process.env.RESEND_API_KEY || '';
  const to = String(row.customer_email || '').trim();
  if (!key || !to.includes('@') || !row?.id) return { ok: false as const };
  const guide = await loadLoyaltyMailGuide({ orderId: row.id, customerId: row.customer_id });
  const message = buildTicketEmail(row, guide);
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
