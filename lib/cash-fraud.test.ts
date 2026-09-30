import { cashAbuseMessage, cashIdentityMessage, cashOptionLock, cashPaySummary } from './cash-fraud';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

const person = {
  firstName: 'Ana',
  lastName: 'Lopez',
  phone: '6141234567',
  email: 'ana@correo.com',
  address: 'Rio de Janeiro 903, Panamericana, 31210',
};

assert(cashIdentityMessage(person) === null, 'datos reales pasan');
assert(cashIdentityMessage({ ...person, firstName: 'A' }) != null, 'nombre corto se rechaza');
assert(cashIdentityMessage({ ...person, phone: '1111111111' }) != null, 'teléfono repetido se rechaza');
assert(cashIdentityMessage({ ...person, phone: '614123' }) != null, 'teléfono corto se rechaza');
assert(cashIdentityMessage({ ...person, email: 'a@mailinator.com' }) != null, 'correo desechable se rechaza');
assert(cashIdentityMessage({ ...person, address: 'calle' }) != null, 'dirección corta se rechaza');

const now = new Date('2026-09-29T18:00:00.000Z');
const open = {
  phone: '6141234567',
  address: 'Rio de Janeiro 903 Panamericana 31210',
  status: 'preparing',
  createdAt: '2026-09-29T17:00:00.000Z',
};
assert(
  cashAbuseMessage({ phone: person.phone, address: person.address, prior: [open], now }) != null,
  'un efectivo abierto bloquea otro'
);
assert(
  cashAbuseMessage({
    phone: '6149998877',
    address: person.address,
    prior: [open],
    now,
  }) != null,
  'la misma dirección con otro teléfono también se bloquea'
);
assert(
  cashAbuseMessage({
    phone: person.phone,
    address: 'Otra calle 10, 31000',
    prior: [{ ...open, status: 'delivered' }, { ...open, status: 'delivered', createdAt: '2026-09-29T16:00:00.000Z' }, { ...open, status: 'delivered', createdAt: '2026-09-29T15:00:00.000Z' }],
    now,
  }) != null,
  'tres efectivos en el día bloquean el cuarto'
);
assert(
  cashAbuseMessage({
    phone: person.phone,
    address: 'Otra calle 10, 31000',
    prior: [{ ...open, status: 'cancelled' }],
    now,
  }) === null,
  'un cancelado no bloquea'
);

assert(cashOptionLock({ identityReady: false, quoting: false, quoted: true, iangel: true, overCap: false, gift: false }) != null, 'sin datos no se puede elegir efectivo');
assert(cashOptionLock({ identityReady: true, quoting: false, quoted: true, iangel: true, overCap: false, gift: false }) === null, 'con datos e IANGEL sí se puede');
assert(cashPaySummary(180).includes('230'), 'el resumen dice el total en la puerta');

console.log('cash-fraud ok');
