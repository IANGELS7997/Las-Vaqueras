export const CUSTOMER_SITE = 'https://lasvaqueras.com.mx';
export const INSTALL_APP_URL = `${CUSTOMER_SITE}/instalar`;

export function escMail(value: unknown) {
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

export function customerOrderUrl(orderId: string, token?: string | null) {
  const id = String(orderId || '').trim();
  const secret = String(token || '').trim();
  return `${CUSTOMER_SITE}/orders/${id}` + (secret ? `?s=${encodeURIComponent(secret)}` : '');
}

/** Los dos botones que van juntos en cada correo del cliente. */
export function customerMailButtons(orderUrl: string) {
  const order = escMail(orderUrl);
  const install = escMail(INSTALL_APP_URL);
  return `<div style="text-align:center;margin:20px 0;">
<a href="${order}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;margin:4px;">Ver mi pedido</a>
<a href="${install}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;margin:4px;">Agregar app al inicio</a>
</div>`;
}

export function customerMailLinksText(orderUrl: string) {
  return `Ver mi pedido: ${orderUrl}\nAgregar app al inicio: ${INSTALL_APP_URL}`;
}
