import type { CartItem } from '@/types';
import { branchById, orderBranchId } from '@/lib/branches';
import { formatMXN } from '@/lib/pricing';
import type { DbOrderRow } from '@/lib/orders-map';

const DEVELOPER_EMAIL = 'iangels7997@gmail.com';
const STORE_EMAIL = 'servicio@lasvaqueras.com.mx';

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
  if ((row.fulfillment_type || '') === 'pickup') return 'Recoger en la sucursal';
  if (row.delivery_provider === 'uber') return 'Uber Direct';
  if (row.delivery_provider === 'managed') return 'La sucursal gestiona el envío';
  return 'Repartidor IANGEL';
}

function payWords(method: string | null | undefined) {
  if (method === 'cash') return 'Efectivo';
  if (method === 'card') return 'Tarjeta';
  return 'Sin dato de pago';
}

function whenClock(iso: string | null | undefined) {
  if (!iso) return 'Sin hora';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin hora';
  return date.toLocaleString('es-MX', {
    timeZone: 'America/Chihuahua',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function itemText(items: CartItem[] | null | undefined) {
  if (!Array.isArray(items) || items.length === 0) return 'Sin platillos';
  return items
    .map((item) => {
      const name = item?.name || 'Platillo';
      const qty = Number(item?.quantity || 1);
      const count = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const extras = Array.isArray(item?.extras) ? item.extras.map((extra) => extra?.name).filter(Boolean) : [];
      const extraText = extras.length > 0 ? ` con ${extras.join(', ')}` : '';
      const removals = Array.isArray(item?.removals) && item.removals.length > 0 ? `. Sin ${item.removals.join(', ')}` : '';
      const note = item?.specialInstructions ? `. Nota: ${item.specialInstructions}` : '';
      return `${count} de ${name}${extraText}${removals}${note}`;
    })
    .join('\n');
}

function placeLines(row: NoticeRow, branchName: string) {
  if ((row.fulfillment_type || '') === 'pickup') {
    return [
      `El cliente va a recoger en ${branchName}.`,
      `Hora para recoger: ${whenClock(row.pickup_at)}.`,
    ];
  }
  return [
    'El cliente pidió envío a domicilio.',
    `Quién lo lleva: ${whoDelivers(row)}.`,
    `Dirección de entrega: ${row.delivery_address || 'Sin dirección'}.`,
    `Referencias: ${row.delivery_references || 'Sin referencias'}.`,
    row.leave_at_door ? 'Pidió dejarlo en la puerta.' : '',
  ].filter(Boolean);
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
  const branch = branchById(orderBranchId(row.branch_id));
  const dishes = itemText(row.items);
  const visit = placeLines(row, branch.shortName);
  const total = Number(row.total_charged || 0);
  const delivery = Number(row.delivery_fee || 0);
  const food = Number.isFinite(total) && Number.isFinite(delivery) ? Number((total - delivery).toFixed(2)) : 0;
  const lines = [
    `Venta hecha. Pedido #${code}.`,
    `Fecha: ${when}.`,
    '',
    `Sucursal: ${branch.name}.`,
    `Dirección de la sucursal: ${branch.address}.`,
    `Teléfono de la sucursal: ${branch.phone}.`,
    `Horario de la sucursal: ${branch.hoursLabel}.`,
    '',
    ...visit,
    '',
    `Cliente: ${row.customer_name || 'Sin nombre'}.`,
    `Teléfono del cliente: ${row.customer_phone || 'Sin teléfono'}.`,
    `Correo del cliente: ${row.customer_email || 'Sin correo'}.`,
    '',
    'Platillos:',
    dishes,
    '',
    `Se le cobró al cliente: ${money(total)}.`,
    `De eso, la comida es ${money(food)}. El envío es ${money(delivery)} y no cuenta como comida.`,
    `Forma de pago: ${payWords(row.pay_method)}.`,
    `Para el restaurante: ${money(row.restaurant_payout)}.`,
    `Para la plataforma: ${money(row.platform_fee)}.`,
    '',
    `Número de pedido: ${row.id}.`,
  ];
  const text = lines.join('\n');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.5;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#9a3412;">Aviso interno · no es el correo del cliente</p>
<h1 style="font-size:22px;margin:0 0 8px;">Venta hecha · #${esc(code)}</h1>
${lines
  .map((line) => (line === '' ? '' : `<p style="margin:0 0 6px;">${esc(line)}</p>`))
  .join('')}
</div>`;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [DEVELOPER_EMAIL, STORE_EMAIL],
      subject: `Venta hecha · #${code} · ${branch.shortName}`,
      html,
      text,
    }),
  });
  return { ok: response.ok };
}
