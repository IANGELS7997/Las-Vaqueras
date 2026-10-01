import { shouldSendUberTrackingEmail, uberTrackingHref } from './uber-tracking-email';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const link = 'https://www.uber.com/track/del_1';

check(uberTrackingHref(link) === link, 'acepta el enlace https');
check(uberTrackingHref('http://uber.com/t') === 'http://uber.com/t', 'acepta http');
check(uberTrackingHref('javascript:alert(1)') === null, 'rechaza otro esquema');
check(uberTrackingHref('') === null, 'vacío no es enlace');

check(
  shouldSendUberTrackingEmail({ previousUrl: null, nextUrl: link, email: 'cliente@correo.com' }) === false,
  'ya no se manda el correo de Uber Direct'
);
check(
  shouldSendUberTrackingEmail({ previousUrl: link, nextUrl: link, email: 'cliente@correo.com' }) === false,
  'no se repite si el enlace ya estaba'
);
check(
  shouldSendUberTrackingEmail({ previousUrl: null, nextUrl: link, email: 'sin-correo' }) === false,
  'sin correo no se manda'
);
check(
  shouldSendUberTrackingEmail({ previousUrl: null, nextUrl: '', email: 'cliente@correo.com' }) === false,
  'sin enlace no se manda'
);
