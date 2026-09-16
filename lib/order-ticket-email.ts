import { kitchenTicketLabel, kitchenTicketLabelCopy } from '@/lib/iangel-labels';
import { formatMXN } from '@/lib/pricing';
import type { CartItem, DeliveryProvider } from '@/types';

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Chihuahua',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Chihuahua',
  });
}

function itemsHtml(items: CartItem[]) {
  return items
    .map((item) => {
      let html = `<p style="margin:0 0 6px;font-weight:700;">${esc(String(item.quantity))}x ${esc(item.name)}</p>`;
      for (const sel of item.selections || []) {
        if (sel.choices?.length) {
          html += `<p style="margin:0 0 2px 12px;">${esc(sel.optionGroupId_label)}: ${esc(sel.choices.join(', '))}</p>`;
        }
      }
      if (item.comboUpgrade?.name) {
        html += `<p style="margin:0 0 2px 12px;">+ ${esc(item.comboUpgrade.name)}</p>`;
      }
      for (const extra of item.extras || []) {
        html += `<p style="margin:0 0 2px 12px;">+ Extra ${esc(extra.name)}</p>`;
      }
      if (item.removals?.length) {
        html += `<p style="margin:0 0 2px 12px;">Sin ${esc(item.removals.join(', ').toLowerCase())}</p>`;
      }
      if (item.specialInstructions) {
        html += `<p style="margin:0 0 2px 12px;font-style:italic;">Nota: ${esc(item.specialInstructions)}</p>`;
      }
      return html;
    })
    .join('');
}

export function buildOrderTicketHtml(input: {
  orderId: string;
  shortCode?: string | null;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerPhoneAlt?: string | null;
  deliveryAddress: string;
  deliveryReferences?: string | null;
  items: CartItem[];
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  totalCharged: number;
  token?: string;
  fulfillment?: 'pickup' | 'delivery';
  provider?: DeliveryProvider | string | null;
  cookHold?: boolean;
  pickupAt?: string | null;
  leaveAtDoor?: boolean;
  sandbox?: boolean;
  uberTrackingUrl?: string | null;
}) {
  const track =
    `https://lasvaqueras.com.mx/orders/${input.orderId}` +
    (input.token ? `?s=${encodeURIComponent(input.token)}` : '');
  const dash = '<div style="border-top:1px dashed #000;margin:8px 0;"></div>';
  const label = kitchenTicketLabel({
    fulfillment: input.fulfillment || 'delivery',
    provider: input.provider,
    cookHold: input.cookHold,
  });
  const banner = input.sandbox
    ? '<p style="margin:0;font-weight:700;">PRUEBA SANDBOX — NO COBRADO</p>'
    : '<p style="margin:0;font-weight:700;">PAGADO EN LINEA — NO COBRAR</p>';
  const modeLine =
    input.fulfillment === 'pickup'
      ? `RECOGER EN TIENDA${input.pickupAt ? ` · ${fmtTime(input.pickupAt)}` : ''}`
      : kitchenTicketLabelCopy(label);
  const alt = input.customerPhoneAlt
    ? `<p style="margin:0;">Tel 2: ${esc(input.customerPhoneAlt)}</p>`
    : '';
  const refs = input.deliveryReferences
    ? `<p style="margin:0;">Ref: ${esc(input.deliveryReferences)}</p>`
    : '';
  const door = input.leaveAtDoor ? '<p style="margin:0;font-weight:700;">Dejar en la puerta</p>' : '';
  const uber = input.uberTrackingUrl
    ? `<p style="margin:8px 0 0;"><a href="${esc(input.uberTrackingUrl)}">Seguimiento Uber Direct</a></p>`
    : '';
  const code = input.shortCode || input.orderId.slice(0, 4).toUpperCase();

  return `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.35;color:#000;max-width:280px;margin:0 auto;">
<div style="text-align:center;">
<img src="https://lasvaqueras.com.mx/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="max-width:120px;height:auto;margin:0 auto 8px;display:block;" />
<p style="margin:0;font-weight:700;">LAS VAQUERAS</p>
<p style="margin:0;">Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih. Mexico</p>
<p style="margin:0;">Tel: +52 614 413 6539</p>
</div>
${dash}
<p style="margin:0;font-size:22px;font-weight:700;text-align:center;">#${esc(code)}</p>
<p style="margin:0;">Fecha: ${esc(fmtDate(input.createdAt))}</p>
<p style="margin:0;">Hora: ${esc(fmtTime(input.createdAt))}</p>
${banner}
<p style="margin:0;font-weight:700;">${esc(modeLine)}</p>
${door}
${dash}
<p style="margin:0;font-weight:700;">Cliente:</p>
<p style="margin:0;">${esc(input.customerName)}</p>
<p style="margin:0;">Tel: ${esc(input.customerPhone)}</p>
${alt}
<p style="margin:0;">${input.fulfillment === 'pickup' ? 'Recoge en tienda' : `Dir: ${esc(input.deliveryAddress)}`}</p>
${refs}
${dash}
${itemsHtml(input.items)}
${dash}
<div style="display:flex;justify-content:space-between;"><span>Comida:</span><span>${esc(formatMXN(input.subtotal))}</span></div>
${input.serviceFee > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Servicio:</span><span>${esc(formatMXN(input.serviceFee))}</span></div>` : ''}
<div style="display:flex;justify-content:space-between;"><span>Envio:</span><span>${esc(formatMXN(input.deliveryFee))}</span></div>
<div style="display:flex;justify-content:space-between;font-weight:700;"><span>TOTAL:</span><span>${esc(formatMXN(input.totalCharged))}</span></div>
${dash}
<div style="text-align:center;">
<p style="margin:8px 0 0;">Gracias por tu compra!</p>
</div>
<div style="text-align:center;margin:16px 0;">
<a href="${esc(track)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-family:Arial,sans-serif;font-size:14px;">Ver mi pedido</a>
${uber}
</div>
</div>`;
}

export async function sendOrderTicketEmail(input: {
  to: string;
  subject?: string;
  html: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to) return { ok: false as const, id: null as string | null };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
      subject: input.subject || 'Las Vaqueras: recibo de tu pedido',
      html: input.html,
      text: input.text,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string };
  return { ok: response.ok, id: payload.id || null };
}
