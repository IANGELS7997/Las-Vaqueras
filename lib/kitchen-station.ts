import { RESTAURANT_INFO } from '@/lib/restaurant';

export const KITCHEN_STATION_ID = 'main';
/** Sin heartbeat en este tiempo = estación caída. */
export const KITCHEN_ONLINE_WINDOW_MS = 45_000;
/** No repetir el mismo tipo de alerta antes de este tiempo. */
export const KITCHEN_ALERT_COOLDOWN_MS = 10 * 60_000;

export const KITCHEN_OPS_EMAILS = [
  'iangels7997@gmail.com',
  'servicio@lasvaqueras.com.mx',
] as const;

export type KitchenStationRow = {
  id: string;
  shift_active: boolean;
  auto_print: boolean;
  last_seen_at: string | null;
  last_print_at: string | null;
  closed_at: string | null;
  offline_alert_sent_at: string | null;
  order_alert_sent_at: string | null;
  updated_at: string;
};

export type KitchenStationView = {
  online: boolean;
  shiftActive: boolean;
  autoPrint: boolean;
  printerReady: boolean;
  lastSeenAt: string | null;
  lastPrintAt: string | null;
  closedAt: string | null;
  statusLabel: string;
  printerLabel: string;
  detail: string;
};

export function isKitchenStationOnline(
  row: Pick<KitchenStationRow, 'shift_active' | 'last_seen_at'> | null | undefined,
  nowMs = Date.now()
): boolean {
  if (!row?.shift_active || !row.last_seen_at) return false;
  const seen = new Date(row.last_seen_at).getTime();
  if (!Number.isFinite(seen)) return false;
  return nowMs - seen <= KITCHEN_ONLINE_WINDOW_MS;
}

export function viewKitchenStation(
  row: KitchenStationRow | null | undefined,
  nowMs = Date.now()
): KitchenStationView {
  const shiftActive = Boolean(row?.shift_active);
  const autoPrint = Boolean(row?.auto_print);
  const online = isKitchenStationOnline(row, nowMs);
  const printerReady = online && autoPrint;

  let statusLabel = 'Cocina cerrada';
  let detail = 'Nadie tiene el panel abierto con turno activo.';
  if (online && autoPrint) {
    statusLabel = 'Estación lista';
    detail = 'Panel abierto, turno activo e impresión automática encendida.';
  } else if (online && !autoPrint) {
    statusLabel = 'Turno activo sin auto-imprimir';
    detail = 'El panel está abierto, pero la impresión automática está apagada.';
  } else if (shiftActive && !online) {
    statusLabel = 'Señal perdida';
    detail = 'Había turno activo, pero dejó de llegar la señal (pestaña cerrada o sin internet).';
  }

  const printerLabel = printerReady
    ? 'Impresión automática activa'
    : online
      ? 'Impresión automática apagada'
      : 'Impresora no lista (panel offline)';

  return {
    online,
    shiftActive,
    autoPrint,
    printerReady,
    lastSeenAt: row?.last_seen_at || null,
    lastPrintAt: row?.last_print_at || null,
    closedAt: row?.closed_at || null,
    statusLabel,
    printerLabel,
    detail,
  };
}

async function sendOpsEmail(input: { subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key) return { ok: false as const, reason: 'missing_resend' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [...KITCHEN_OPS_EMAILS],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });
  return { ok: response.ok as boolean };
}

function alertCooldownOk(iso: string | null | undefined, nowMs: number) {
  if (!iso) return true;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return true;
  return nowMs - t >= KITCHEN_ALERT_COOLDOWN_MS;
}

export async function sendKitchenOfflineAlert(args: {
  reason: 'closed' | 'stale' | 'order_while_offline';
  orderId?: string;
  shortCode?: string | null;
}): Promise<{ sent: boolean }> {
  const nowMs = Date.now();
  const when = new Date(nowMs).toLocaleString('es-MX', { timeZone: 'America/Chihuahua' });
  const place = RESTAURANT_INFO.address;

  let subject = 'Alerta cocina: panel cerrado · Las Vaqueras';
  let lead =
    'La pantalla de cocina (admin) dejó de estar activa. Mientras no la abran de nuevo con turno e impresión automática, los tickets de caja no van a salir solos.';

  if (args.reason === 'stale') {
    subject = 'Alerta cocina: se perdió la señal del panel · Las Vaqueras';
    lead =
      'Había un turno de cocina activo, pero la señal dejó de llegar (cerraron la pestaña, se fue el internet o se apagó la computadora).';
  }
  if (args.reason === 'order_while_offline') {
    subject = 'Urgente: pedido pagado y cocina offline · Las Vaqueras';
    lead = `Un cliente ya pagó${args.shortCode ? ` (orden ${args.shortCode})` : args.orderId ? ` (orden ${args.orderId.slice(0, 8)})` : ''} y en este momento el panel de cocina no está activo. Hay que abrir cocina.lasvaqueras.com.mx, iniciar turno y confirmar la impresora.`;
  }

  const text = [
    lead,
    '',
    `Hora: ${when}`,
    `Local: ${place}`,
    'Qué hacer: abrir https://cocina.lasvaqueras.com.mx , iniciar turno, dejar impresión automática encendida y no cerrar esa pestaña.',
    'Avisos: Angel (iangels7997@gmail.com) y dueño (servicio@lasvaqueras.com.mx).',
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111;line-height:1.5;">
<p>${lead}</p>
<p><strong>Hora:</strong> ${when}<br/><strong>Local:</strong> ${place}</p>
<p><strong>Qué hacer ahora:</strong></p>
<ol>
<li>Abrir <a href="https://cocina.lasvaqueras.com.mx">cocina.lasvaqueras.com.mx</a></li>
<li>Iniciar turno</li>
<li>Dejar impresión automática encendida</li>
<li>No cerrar esa pestaña durante el servicio</li>
</ol>
<p>Este aviso se envió a Angel y al correo del negocio.</p>
</div>`;

  const result = await sendOpsEmail({ subject, text, html });
  return { sent: result.ok };
}

export function shouldSendOfflineAlert(
  row: KitchenStationRow | null | undefined,
  nowMs = Date.now()
): boolean {
  if (isKitchenStationOnline(row, nowMs)) return false;
  return alertCooldownOk(row?.offline_alert_sent_at, nowMs);
}

export function shouldSendOrderOfflineAlert(
  row: KitchenStationRow | null | undefined,
  nowMs = Date.now()
): boolean {
  if (isKitchenStationOnline(row, nowMs) && row?.auto_print) return false;
  return alertCooldownOk(row?.order_alert_sent_at, nowMs);
}
