export const CHECKOUT_FIELDS = {
  firstName: { short: 'Nombre', phrase: 'el nombre' },
  lastName: { short: 'Apellido', phrase: 'el apellido' },
  phone: { short: 'Teléfono', phrase: 'el teléfono' },
  email: { short: 'Correo', phrase: 'el correo' },
  pickupAt: { short: 'Hora para recoger', phrase: 'la hora para recoger' },
  street: { short: 'Calle', phrase: 'la calle' },
  extNumber: { short: 'Número exterior', phrase: 'el número exterior' },
  intNumber: { short: 'Número interior', phrase: 'el número interior' },
  colonia: { short: 'Colonia', phrase: 'la colonia' },
  postalCode: { short: 'Código postal', phrase: 'el código postal' },
  references: { short: 'Referencias', phrase: 'las referencias' },
} as const;

export type CheckoutFieldId = keyof typeof CHECKOUT_FIELDS;

function clip(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 300 ? text.slice(0, 300) : text;
}

export function checkoutFieldChange(field: string, before: string, after: string, lastSent: string) {
  if (!(field in CHECKOUT_FIELDS)) return null;
  const next = clip(after);
  const prev = clip(before);
  const sent = clip(lastSent);
  if (!next || next === prev || next === sent) return null;
  const label = CHECKOUT_FIELDS[field as CheckoutFieldId];
  return { field: field as CheckoutFieldId, value: next, short: label.short, phrase: label.phrase };
}
