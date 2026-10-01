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

/** Mismo acceso del pedido, para que instalar entre con su perfil. */
export function customerInstallUrl(orderId: string, token?: string | null) {
  const id = String(orderId || '').trim();
  const secret = String(token || '').trim();
  const params = new URLSearchParams();
  if (id) params.set('pedido', id);
  if (secret) params.set('s', secret);
  const query = params.toString();
  return query ? `${INSTALL_APP_URL}?${query}` : INSTALL_APP_URL;
}

/** Misma página de instalar, dentro del sitio que el cliente ya tiene abierto. */
export function customerInstallPath(orderId: string, token?: string | null) {
  return customerInstallUrl(orderId, token).slice(CUSTOMER_SITE.length) || '/instalar';
}

function installUrlForOrderLink(orderUrl: string) {
  try {
    const url = new URL(orderUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const id = parts[0] === 'orders' ? parts[1] || '' : '';
    return customerInstallUrl(id, url.searchParams.get('s'));
  } catch {
    return INSTALL_APP_URL;
  }
}

/** Los dos botones que van juntos en cada correo del cliente. */
export function customerMailButtons(orderUrl: string) {
  const order = escMail(orderUrl);
  const install = escMail(installUrlForOrderLink(orderUrl));
  return `<div style="text-align:center;margin:20px 0;">
<a href="${order}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;margin:4px;">Ver mi pedido</a>
<a href="${install}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;margin:4px;">Agregar app al inicio</a>
</div>`;
}

export function customerMailLinksText(orderUrl: string) {
  const install = installUrlForOrderLink(orderUrl);
  return `Ver mi pedido: ${orderUrl}\nAgregar app al inicio: ${install}`;
}
