const DEVELOPER_EMAIL = 'iangels7997@gmail.com';

function esc(value: unknown) {
  return String(value == null ? '' : value)
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;');
}

/** Aviso interno cuando Angel enciende o apaga Uber Direct. */
export async function sendUberDirectNotice(input: { enabled: boolean; actor: string }) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key) return { ok: false as const };
  const when = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Chihuahua',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const state = input.enabled ? 'activado' : 'apagado';
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.45;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#9a3412;">IANGEL · Uber Direct</p>
<h1 style="font-size:22px;margin:0 0 8px;">Uber Direct ${esc(state)}</h1>
<p style="margin:0 0 12px;">${esc(when)} · Chihuahua</p>
<p><strong>Quién:</strong> ${esc(input.actor)}<br/>
<strong>Estado:</strong> ${esc(state)}</p>
<p>${input.enabled ? 'Los pedidos nuevos de 0 a 5.5 km pueden salir por Uber.' : 'Los pedidos de turno siguen con el rider.'}</p>
</div>`;
  const text = [`Uber Direct ${state}`, when, input.actor].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [DEVELOPER_EMAIL],
      subject: `Uber Direct ${state} · IANGEL`,
      html,
      text,
    }),
  });
  return { ok: response.ok };
}
