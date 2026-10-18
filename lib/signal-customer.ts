const MISSING = 'Todavía no lo escribió';
const UNCHOSEN = 'Todavía no lo eligió';

export type SignalCustomer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  branch: string;
  how: string;
  address: string;
  references: string;
  pickupAt: string;
};

export type SignalCustomerInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  branch?: string;
  how?: string;
  street?: string;
  extNumber?: string;
  intNumber?: string;
  colonia?: string;
  postalCode?: string;
  references?: string;
  pickupAt?: string;
};

function clean(value: unknown, max: number) {
  const text = String(value ?? '')
    .replace(/\d(?:[ -]?\d){12,18}/g, '[tarjeta]')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max) : text;
}

function written(value: unknown, max = 160) {
  return clean(value, max) || MISSING;
}

function pickupLabel(value: unknown) {
  const raw = clean(value, 40);
  if (!raw) return UNCHOSEN;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return written(raw, 40);
  return parsed.toLocaleString('es-MX', {
    timeZone: 'America/Chihuahua',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function shapeSignalCustomer(input: SignalCustomerInput): SignalCustomer {
  const howRaw = clean(input.how, 20);
  const delivery = howRaw === 'delivery';
  const pickup = howRaw === 'pickup';
  const street = [clean(input.street, 120), clean(input.extNumber, 20)].filter(Boolean).join(' ');
  const interior = clean(input.intNumber, 20);
  const parts = [street, interior ? `Int. ${interior}` : '', clean(input.colonia, 80), clean(input.postalCode, 10)].filter(Boolean);

  return {
    firstName: written(input.firstName),
    lastName: written(input.lastName),
    phone: written(input.phone, 30),
    email: written(input.email),
    branch: clean(input.branch, 80) || UNCHOSEN,
    how: delivery ? 'Domicilio' : pickup ? 'Recoger en tienda' : UNCHOSEN,
    address: pickup ? 'Recoge en la sucursal' : parts.join(', ') || 'Todavía no la escribió',
    references: pickup ? 'No aplica' : written(input.references),
    pickupAt: delivery ? 'No aplica' : pickupLabel(input.pickupAt),
  };
}
