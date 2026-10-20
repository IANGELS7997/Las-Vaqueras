import { attachSignalPlace, decideDevSignal, notifyBody } from './dev-signal';
import { signalOriginOf } from './signal-origin';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const meta = { userAgent: 'Mozilla/5.0', ip: '203.0.113.10', now: 1_700_000_000_000 };

const visit = decideDevSignal(
  {
    source: 'las-vaqueras',
    type: 'visit',
    session: 'visit-one',
    message: 'entrada',
    detail: {
      referrer: 'google.com',
      utm: 'source instagram · campaign octubre',
      customer: {
        firstName: 'Ana',
        lastName: 'Todavía no lo escribió',
        phone: '6141112233',
        email: 'Todavía no lo escribió',
        address: 'Rio 10',
        ip: '203.0.113.10',
      },
      ip: '203.0.113.10',
    },
  },
  meta
);
check(visit.forward, 'la visita se acepta');
const visitDetail = visit.payload?.detail as Record<string, unknown>;
const visitCustomer = visitDetail.customer as Record<string, string>;
check(visitDetail.referrer === 'google.com', 'el origen queda en el detalle');
check(visitDetail.utm === 'source instagram · campaign octubre', 'la campaña queda en el detalle');
check(visitCustomer.firstName === 'Ana' && visitCustomer.phone === '6141112233', 'el contacto real se guarda');
check(!visitCustomer.lastName && !visitCustomer.email, 'el relleno no se guarda como dato');
check(!('ip' in visitDetail) && !('ip' in visitCustomer), 'la ip no viaja en el detalle');
check(!('customer' in (visit.payload || {})), 'la visita no manda el contacto suelto');

const again = decideDevSignal(
  { source: 'las-vaqueras', type: 'visit', session: 'visit-one', detail: { referrer: 'otra.com' } },
  meta
);
check(!again.forward && again.reason === 'visit', 'la misma sesión no repite la visita');

const placedBranch = decideDevSignal(
  {
    source: 'las-vaqueras',
    type: 'visit',
    session: 'visit-one',
    attachBranch: true,
    detail: { branch: 'norte', origin: 'qr', customer: { firstName: 'Ana' } },
  },
  meta
);
check(placedBranch.forward, 'completar la sucursal pasa aunque la visita ya se contó');
check(placedBranch.payload?.attachBranch === true, 'la marca de sucursal viaja al panel');
check(placedBranch.payload?.session === 'visit-one', 'la sesión identifica la visita');
const placedBranchDetail = placedBranch.payload?.detail as Record<string, unknown>;
check(placedBranchDetail.branch === 'norte' && placedBranchDetail.origin === 'qr', 'sucursal y origen quedan en el detalle');
const placedNotice = notifyBody(placedBranch.payload || {});
check(!('detail' in placedNotice) && !('session' in placedNotice) && !('attachBranch' in placedNotice), 'el aviso externo no lleva sucursal ni sesión');

const stillOnce = decideDevSignal(
  { source: 'las-vaqueras', type: 'visit', session: 'visit-one' },
  meta
);
check(!stillOnce.forward && stillOnce.reason === 'visit', 'completar la sucursal no abre otra visita');

const bareAttach = decideDevSignal(
  { source: 'las-vaqueras', type: 'visit', session: 'visit-two', attachBranch: true, detail: { origin: 'qr' } },
  { ...meta, ip: '203.0.113.13' }
);
check(!bareAttach.forward && bareAttach.reason === 'branch', 'sin sucursal no se completa la visita');

const cart = decideDevSignal(
  {
    source: 'las-vaqueras',
    type: 'cart',
    session: 'cart-one',
    detail: { branch: 'Sucursal Centro', origin: 'mail', referrer: 'google.com' },
  },
  { ...meta, ip: '203.0.113.14' }
);
check(cart.forward, 'el carrito se acepta');
const cartDetail = cart.payload?.detail as Record<string, unknown>;
check(cartDetail.referrer === 'google.com', 'el carrito conserva el referrer');
check(!('branch' in cartDetail) && !('origin' in cartDetail), 'sucursal y origen inválidos no se guardan');
check(cart.payload?.session === 'cart-one', 'el carrito lleva la sesión');

check(signalOriginOf('google.com', '') === 'google', 'google.com es Google');
check(signalOriginOf('www.google.com.mx', '') === 'google', 'google.com.mx es Google');
check(signalOriginOf('', 'qr') === 'qr', 'utm_source=qr es QR');
check(signalOriginOf('google.com', 'qr') === 'qr', 'el QR gana sobre Google');
check(signalOriginOf('', 'google') === 'google', 'utm_source=google es Google');
check(signalOriginOf('instagram.com', '') === 'otro', 'otro dominio no es Google');

const dial = decideDevSignal(
  {
    source: 'las-vaqueras',
    type: 'help_dial',
    session: 'dial-one',
    message: 'Abrió el marcador',
    action: 'Sucursal Centro',
    detail: { customer: { firstName: 'Todavía no lo escribió', phone: '' } },
  },
  { ...meta, ip: '203.0.113.11' }
);
check(dial.forward && dial.payload?.type === 'help_dial', 'abrir el marcador se cuenta');
check(!('detail' in (dial.payload || {})), 'sin contacto real no hay detalle');

const placed = attachSignalPlace(dial.payload || {}, { city: 'Chihuahua', region: 'CHH' });
const placedDetail = placed.detail as Record<string, string>;
check(placedDetail.city === 'Chihuahua' && placedDetail.region === 'CHH', 'la ciudad se pega en el servidor');
const notice = notifyBody(placed);
check(!('detail' in notice) && notice.type === 'help_dial', 'el aviso externo no lleva el detalle');

const ignored = attachSignalPlace({ type: 'cart', message: '1× Taco' }, { city: 'Chihuahua' });
check(!('detail' in ignored), 'un carrito no recibe ciudad');

const rider = decideDevSignal(
  { source: 'iangel-rider', type: 'help_dial', session: 'rider-dial' },
  { ...meta, ip: '203.0.113.12' }
);
check(!rider.forward && rider.reason === 'type', 'el rider no usa el marcador de la tienda');

console.log('dev-signal ok');
