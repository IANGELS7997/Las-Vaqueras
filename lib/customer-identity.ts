export function normalizeNameKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('52')) return digits.slice(-10);
  return digits.slice(-10);
}

export function fullCustomerName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
}

export function isValidCustomerPhone(value: string) {
  return normalizePhone(value).length === 10;
}
