import { calcCartItemPrice } from '@/lib/pricing';

export type LoyaltyKind = 'first_30' | 'fifth_20' | 'tenth_jumbo';

export const JUMBO_PRODUCT_ID = 'papas-jumbo';
export const JUMBO_PRODUCT_NAME = 'Papas Jumbo';

/** Pedidos pagados antes de este, más uno. No reinicia cada 10. */
export function paidOrderOrdinal(paidCountBeforeThis: number): number {
  const count = Number.isFinite(paidCountBeforeThis) ? Math.max(0, Math.floor(paidCountBeforeThis)) : 0;
  return count + 1;
}

export function loyaltyCycleLabel(paidOrders: number, ordinal: number): string {
  if (paidOrders >= 10) return 'Promos de lealtad completadas';
  return `Pedido ${ordinal}`;
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
  if (kind === 'tenth_jumbo') {
    return 'Pedido 10. Al pagar recibes un cupón de Papas Jumbo, 30 días para canjear.';
  }
  return '';
}

export function foodDiscountPercentLabel(kind: LoyaltyKind | null): string {
  if (kind === 'first_30') return '30%';
  if (kind === 'fifth_20') return '20%';
  return '';
}

/** Líneas grandes para ticket de caja / POS (sin comisiones). */
export function loyaltyCajaTicketLines(kind: string | null | undefined): string[] {
  if (kind === 'first_30') {
    return [
      '*** PROMO PRIMER PEDIDO ***',
      '30% YA INCLUIDO EN ESTE TOTAL',
      'NO DESCONTAR OTRA VEZ',
    ];
  }
  if (kind === 'fifth_20') {
    return [
      '*** PROMO 5.o PEDIDO ***',
      '20% YA INCLUIDO EN ESTE TOTAL',
      'NO DESCONTAR OTRA VEZ',
    ];
  }
  if (kind === 'tenth_jumbo' || kind === 'jumbo_credit') {
    return [
      '*** PROMO 10.o PEDIDO ***',
      'PAPAS JUMBO DE REGALO',
      'MARCAR REGALO EN EL POS',
    ];
  }
  return [];
}

export type FoodDiscountLine = {
  uid: string;
  price_base: number;
  quantity: number;
  comboUpgrade?: { price_base: number };
  extras?: { price_base: number }[];
};

export type FoodDiscountQuote = {
  fullWeb: number;
  chargedWeb: number;
  discountPesos: number;
  percentPesos: number;
  giftPesos: number;
};

/**
 * Descuento por unidad de comida, al peso, y luego se suman.
 * Una unidad regalada (cupón Jumbo) sale completa. El porcentaje va en las demás.
 */
export function quoteFoodDiscount(items: FoodDiscountLine[], rate: number, giftUid = ''): FoodDiscountQuote {
  let fullWeb = 0;
  let chargedWeb = 0;
  let percentPesos = 0;
  let giftPesos = 0;
  const safeRate = Number.isFinite(rate) && rate > 0 ? Math.min(rate, 1) : 0;

  for (const item of items) {
    const qty = Number.isFinite(item.quantity) ? Math.floor(item.quantity) : 0;
    if (qty <= 0) continue;
    const unit = calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base, item.extras);
    if (!Number.isFinite(unit) || unit <= 0) continue;
    fullWeb += unit * qty;
    const gifted = Boolean(giftUid) && item.uid === giftUid;
    const freeUnits = gifted ? 1 : 0;
    const payableUnits = qty - freeUnits;
    giftPesos += unit * freeUnits;
    const unitCharged = safeRate > 0 ? Math.round(unit * (1 - safeRate)) : unit;
    chargedWeb += unitCharged * payableUnits;
    percentPesos += (unit - unitCharged) * payableUnits;
  }

  return {
    fullWeb,
    chargedWeb,
    percentPesos,
    giftPesos,
    discountPesos: percentPesos + giftPesos,
  };
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
