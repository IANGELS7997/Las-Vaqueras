import type { CartItem } from '@/types';
import { formatMXN } from '@/lib/pricing';
import type { DbOrderRow } from '@/lib/orders-map';

const DEVELOPER_EMAIL = 'iangels7997@gmail.com';

type NoticeRow = DbOrderRow & {
  delivery_provider?: string | null;
};

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

function money(value: number | string | null | undefined) {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return formatMXN(Number.isFinite(amount) ? amount : 0);
}

function whoDelivers(row: NoticeRow) {
  if ((row.fulfillment_type || '') === 'pickup') return 'Recoger en tienda';
  if (row.delivery_provider === 'uber') return 'Uber Direct';
  return 'IANGEL';
}

function itemLines(items: CartItem[] | null | undefined) {
  if (!Array.isArray(items) || items.length === 0) return '<li>Sin platillos</li>';
  return items
    .map((item) => {
      const name = esc(item?.name || 'Platillo');
      const qty = Number(item?.quantity || 1);
      const note = item?.specialInstructions ? ` (${esc(item.specialInstructions)})` : '';
      return `<li>${Number.isFinite(qty) && qty > 0 ? qty : 1}× ${name}${note}</li>`;
    })
    .join('');
}

/** Aviso interno de una compra ya pagada. No es el ticket del cliente. */
export async function sendDeveloperPurchaseNotice(row: NoticeRow) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || !row?.id) return { ok: false as const };
  const code = row.short_code || row.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const when = new Date(row.created_at || Date.now()).toLocaleString('es-MX', {
    timeZone: 'America/Chihuahua',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const place =
    (row.fulfillment_type || '') === 'pickup'
      ? 'Recoger en Rio de Janeiro 903, Panamericana'
      : row.delivery_address || 'Sin dirección';
  const kitchen = 'https://cocina.lasvaqueras.com.mx';
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.45;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#9a3412;">Aviso interno · no es el ticket del cliente</p>
<h1 style="font-size:22px;margin:0 0 8px;">Compra nueva #${esc(code)}</h1>
<p style="margin:0 0 16px;">${esc(when)} · Chihuahua</p>
<p><strong>Cliente:</strong> ${esc(row.customer_name)}<br/>
<strong>Teléfono:</strong> ${esc(row.customer_phone)}<br/>
<strong>Correo:</strong> ${esc(row.customer_email || '—')}</p>
<p><strong>Entrega:</strong> ${esc(whoDelivers(row))}<br/>
<strong>Lugar:</strong> ${esc(place)}<br/>
<strong>Referencias:</strong> ${esc(row.delivery_references || '—')}</p>
<p><strong>Platillos</strong></p>
<ul>${itemLines(row.items)}</ul>
<p><strong>Total cobrado:</strong> ${esc(money(row.total_charged))}<br/>
<strong>Envío:</strong> ${esc(money(row.delivery_fee))}<br/>
<strong>Tarifa de servicio:</strong> ${esc(money(row.customer_fee))}<br/>
<strong>Pago al restaurante:</strong> ${esc(money(row.restaurant_payout))}<br/>
<strong>Fee de plataforma:</strong> ${esc(money(row.platform_fee))}</p>
<p><strong>Estado:</strong> ${esc(row.status)} · ${esc(row.dispatch_status || 'sin reparto')}<br/>
<strong>Pedido:</strong> ${esc(row.id)}<br/>
<strong>Pago:</strong> ${esc(row.stripe_payment_intent_id)}</p>
<p><a href="${kitchen}">Abrir cocina</a></p>
</div>`;
  const text = [
    `Compra nueva #${code}`,
    when,
    `${row.customer_name} · ${row.customer_phone} · ${row.customer_email || 'sin correo'}`,
    `${whoDelivers(row)} · ${place}`,
    `Referencias: ${row.delivery_references || '—'}`,
    `Total ${money(row.total_charged)} · envío ${money(row.delivery_fee)}`,
    `Restaurante ${money(row.restaurant_payout)} · plataforma ${money(row.platform_fee)}`,
    `Pedido ${row.id}`,
    kitchen,
  ].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [DEVELOPER_EMAIL],
      subject: `Compra nueva · #${code} · Las Vaqueras`,
      html,
      text,
    }),
  });
  return { ok: response.ok };
}
