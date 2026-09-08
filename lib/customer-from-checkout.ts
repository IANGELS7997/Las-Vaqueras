export function namesFromCheckout(customer: {
  name?: string;
  firstName?: string;
  lastName?: string;
}) {
  const firstName = customer.firstName?.trim() || '';
  const lastName = customer.lastName?.trim() || '';
  if (firstName && lastName) return { firstName, lastName };

  const parts = (customer.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
