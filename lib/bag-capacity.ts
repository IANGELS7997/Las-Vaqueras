import { getMenuItemById } from '@/lib/mock-data';

/** 12 cajas chicas = 9 cajas grandes. */
export const BAG_UNIT_SMALL = 3;
export const BAG_UNIT_LARGE = 4;
export const BAG_UNIT_CAP = 36;

const LARGE_IDS = new Set(['papas-jumbo', 'boneless-jumbo']);

export const BAG_LIMIT_TITLE = 'Capacidad límite de pedido';
export const BAG_LIMIT_BODY =
  'La mochila del repartidor ya va llena. Quita algún artículo para continuar.';

export function iangelCarries(kind: string | null | undefined): boolean {
  return kind === 'self' || kind === 'wait_self';
}

export function bagUnits(items: { menuItemId?: string; quantity?: number }[]): number {
  return items.reduce((sum, item) => {
    const id = item.menuItemId || '';
    const menu = id ? getMenuItemById(id) : undefined;
    if (menu?.category === 'bebidas') return sum;
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty <= 0) return sum;
    const unit = LARGE_IDS.has(id) ? BAG_UNIT_LARGE : BAG_UNIT_SMALL;
    return sum + qty * unit;
  }, 0);
}

export function bagFits(items: { menuItemId?: string; quantity?: number }[]): boolean {
  return bagUnits(items) <= BAG_UNIT_CAP;
}
