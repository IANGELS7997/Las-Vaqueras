import { isValidCustomerEmail, normalizePhone } from '@/lib/customer-identity';
import { CASH_FOOD_CAP_MXN } from '@/lib/iangel-cash';
import { SELF_FEE_MXN } from '@/lib/iangel-constants';
import { addressKey } from '@/lib/loyalty';
import { formatMXN } from '@/lib/pricing';

/** Un efectivo abierto por teléfono o dirección. Tres en el día, contando los ya entregados. */
export const CASH_OPEN_LIMIT = 1;
export const CASH_DAY_LIMIT = 3;

const DISPOSABLE_EMAIL = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  'yopmail.com',
  '10minutemail.com',
  'trashmail.com',
]);

export type CashPriorOrder = {
  phone: string;
  address: string;
  status: string;
  createdAt: string;
};

function letters(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function nameOk(value: string) {
  const clean = value.trim();
  if (clean.length < 2 || clean.length > 40) return false;
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(clean)) return false;
  const flat = letters(clean).replace(/\s+/g, '').toLowerCase();
  if (/^(.)\1+$/.test(flat)) return false;
  return true;
}

export function cashPhoneOk(value: string) {
  const digits = normalizePhone(value);
  if (!/^[2-9][0-9]{9}$/.test(digits)) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false;
  if (digits === '1234567890' || digits === '0123456789') return false;
  return true;
}

function emailOk(value: string) {
  const email = value.trim().toLowerCase();
  if (!isValidCustomerEmail(email)) return false;
  if (email.endsWith('@riders.iangel.local')) return false;
  const domain = email.split('@')[1] || '';
  if (DISPOSABLE_EMAIL.has(domain)) return false;
  return true;
}

export function cashIdentityMessage(input: {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  fulfillment?: string | null;
}) {
  if (!nameOk(input.firstName) || !nameOk(input.lastName)) {
    return 'Escribe nombre y apellido reales para pagar en efectivo.';
  }
  if (!cashPhoneOk(input.phone)) {
    return 'El teléfono tiene que ser un número de 10 dígitos para pagar en efectivo.';
  }
  if (!emailOk(input.email)) {
    return 'Usa un correo real. Ahí llega el ticket del pedido en efectivo.';
  }
  if (String(input.fulfillment || '') !== 'pickup' && input.address.trim().length < 8) {
    return 'Falta la dirección de entrega para pagar en efectivo.';
  }
  return null;
}

function closed(status: string) {
  const value = status.toLowerCase();
  return value === 'delivered' || value === 'cancelled' || value === 'canceled';
}

function chihuahuaDayStart(now: Date) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chihuahua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return new Date(`${day}T00:00:00-06:00`).getTime();
}

export function cashAbuseMessage(input: {
  phone: string;
  address: string;
  prior: CashPriorOrder[];
  now?: Date;
  fulfillment?: string | null;
}) {
  if (String(input.fulfillment || '') === 'pickup') return null;
  const phone = normalizePhone(input.phone);
  const place = addressKey({ address: input.address });
  const start = chihuahuaDayStart(input.now || new Date());
  let openPhone = 0;
  let openPlace = 0;
  let today = 0;
  for (const order of input.prior) {
    const status = order.status.toLowerCase();
    const cancelled = status === 'cancelled' || status === 'canceled';
    const samePhone = normalizePhone(order.phone) === phone;
    const samePlace = place.length >= 8 && addressKey({ address: order.address }) === place;
    const at = new Date(order.createdAt).getTime();
    if (samePhone && !closed(status)) openPhone += 1;
    if (samePlace && !closed(status)) openPlace += 1;
    if (samePhone && !cancelled && Number.isFinite(at) && at >= start) today += 1;
  }
  if (openPhone >= CASH_OPEN_LIMIT) {
    return 'Ya tienes un pedido en efectivo sin entregar. Recíbelo antes de pedir otro.';
  }
  if (openPlace >= CASH_OPEN_LIMIT) {
    return 'Esta dirección ya tiene un pedido en efectivo abierto.';
  }
  if (today >= CASH_DAY_LIMIT) {
    return 'Hoy ya usaste el efectivo varias veces. El siguiente pedido es con tarjeta.';
  }
  return null;
}

export function cashOptionLock(input: {
  identityReady: boolean;
  quoting: boolean;
  quoted: boolean;
  iangel: boolean;
  overCap: boolean;
  gift: boolean;
  pickup?: boolean;
}) {
  if (input.gift) return 'Este cupón no se paga en efectivo.';
  if (!input.identityReady) {
    return input.pickup
      ? 'Completa nombre, apellido, teléfono y correo para pagar en efectivo en la tienda.'
      : 'Completa nombre, apellido, teléfono, correo y el punto en el mapa para elegir pago en efectivo.';
  }
  if (input.pickup) return null;
  if (input.quoting || !input.quoted) return 'Espera un momento mientras cotizamos el envío.';
  if (!input.iangel) return 'En esta distancia el pago es solo con tarjeta.';
  if (input.overCap) return `La comida pasa de ${formatMXN(CASH_FOOD_CAP_MXN)}. Solo tarjeta.`;
  return null;
}

export function cashPaySummary(food: number, fulfillment?: string | null, deliveryFee?: number | null) {
  const comida = Math.round(Number(food));
  if (String(fulfillment || '') === 'pickup') {
    return `Pagas ${formatMXN(comida)} en el mostrador al recoger. No entra un rider.`;
  }
  const envio =
    typeof deliveryFee === 'number' && Number.isFinite(deliveryFee) && deliveryFee > 0
      ? Math.round(deliveryFee)
      : SELF_FEE_MXN;
  const puerta = comida + envio;
  return `El rider deja ${formatMXN(comida)} de comida en la tienda. En tu puerta pagas ${formatMXN(puerta)}: la comida y ${formatMXN(envio)} de envío. Si no estás para recibirlo, el pedido no se entrega. Solo puedes tener un pedido en efectivo abierto.`;
}
