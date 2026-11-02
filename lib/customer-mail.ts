import { mailButton } from '@/lib/mail-shell';

export const CUSTOMER_SITE = 'https://lasvaqueras.com.mx';
export const INSTALL_APP_URL = `${CUSTOMER_SITE}/instalar`;

/** Solo en el ticket, el correo de en camino y el de llegada. */
export const INSTALL_APP_REMINDER =
  'Recuerda agregar la app al inicio. Ahí podrás consultar tu perfil y promociones.';

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
  return `${mailButton(order, 'Ver mi pedido', 'primary')}${mailButton(install, 'Agregar app al inicio', 'secondary')}`;
}

export function customerMailLinksText(orderUrl: string) {
  const install = installUrlForOrderLink(orderUrl);
  return `Ver mi pedido: ${orderUrl}\nAgregar app al inicio: ${install}`;
}

export const DEVELOPER_ORDER_COPY = 'iangels7997@gmail.com';

/** Copia interna de cada correo que recibe el cliente. */
export function customerCopyBcc(to: string): string[] | undefined {
  const dest = to.trim().toLowerCase();
  if (!dest.includes('@') || dest === DEVELOPER_ORDER_COPY) return undefined;
  return [DEVELOPER_ORDER_COPY];
}
