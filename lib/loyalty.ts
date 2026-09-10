export type LoyaltyKind = 'first_30' | 'fifth_20' | 'tenth_jumbo';

export const JUMBO_PRODUCT_ID = 'papas-jumbo';
export const JUMBO_PRODUCT_NAME = 'Papas Jumbo';

const CYCLE = 10;

export function paidOrderOrdinal(paidCountBeforeThis: number): number {
  return (paidCountBeforeThis % CYCLE) + 1;
}

export function loyaltyKindForOrdinal(ordinal: number): LoyaltyKind | null {
  if (ordinal === 1) return 'first_30';
  if (ordinal === 5) return 'fifth_20';
  if (ordinal === 10) return 'tenth_jumbo';
  return null;
}

export function foodDiscountRate(kind: LoyaltyKind | null): number {
  if (kind === 'first_30') return 0.3;
  if (kind === 'fifth_20') return 0.2;
  return 0;
}

export function loyaltyLabel(kind: LoyaltyKind | null): string {
  if (kind === 'first_30') return 'Promoción primer pedido (30% en comida)';
  if (kind === 'fifth_20') return 'Promoción 5.º pedido (20% en comida)';
  if (kind === 'tenth_jumbo') return 'Promoción 10.º pedido (Papas Jumbo)';
  return '';
}

export function discountedFoodBase(priceBaseTotal: number, kind: LoyaltyKind | null): number {
  const rate = foodDiscountRate(kind);
  return Math.round(Math.max(0, priceBaseTotal) * (1 - rate) * 100) / 100;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function addressKey(input: { street?: string; extNumber?: string; postalCode?: string; address?: string }): string {
  const raw = [input.street, input.extNumber, input.postalCode, input.address]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  return raw.slice(0, 80);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for') || headers.get('x-real-ip') || '';
  return forwarded.split(',')[0]?.trim() || 'unknown';
}
