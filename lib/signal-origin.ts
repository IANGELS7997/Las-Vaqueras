export type SignalOrigin = 'qr' | 'google' | 'otro';

function isGoogleHost(host: string) {
  if (!host || host.includes('..')) return false;
  if (host === 'google.com' || host.endsWith('.google.com')) return true;
  if (host === 'google.com.mx' || host.endsWith('.google.com.mx')) return true;
  return false;
}

/** QR gana si el enlace trae utm_source=qr. Google sale del dominio o de utm_source=google. */
export function signalOriginOf(referrerHost: string, utmSource: string): SignalOrigin {
  const source = utmSource.trim().toLowerCase();
  if (source === 'qr') return 'qr';
  const host = referrerHost.trim().toLowerCase().replace(/^www\./, '');
  if (source === 'google' || isGoogleHost(host)) return 'google';
  return 'otro';
}
