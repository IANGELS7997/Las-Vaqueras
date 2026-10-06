import { MENU_ITEMS } from '@/lib/mock-data';
import type { CartItem } from '@/types';

/** Ya no se venden. El checkout los rechaza aunque vengan en un carrito viejo. */
const RETIRED_IDS = ['s-tamarindo', 'agua-fresca-500'] as const;

/** El extra de hamburguesa y el ingrediente de papas salen del mismo interruptor. */
const EXTRA_ALSO_BLOCKS: Record<string, string[]> = {
  'extra-tocino': ['tocino'],
  'extra-salchicha': ['salchicha'],
  'extra-fajitas': ['fajitas-res'],
};

export type StockRow = {
  id: string;
  name: string;
  kind: 'product' | 'sauce' | 'extra';
};

function isSauceGroup(id: string, label: string) {
  return /salsa|sauce/i.test(`${id} ${label}`);
}

function collect() {
  const sauces = new Map<string, string>();
  const extras = new Map<string, string>();
  const names = new Map<string, string>();
  for (const item of MENU_ITEMS) {
    names.set(item.id, item.name);
    for (const group of item.optionGroups || []) {
      if (!isSauceGroup(group.id, group.label)) continue;
      for (const choice of group.choices) {
        sauces.set(choice.id, choice.name);
        names.set(choice.id, choice.name);
      }
    }
    for (const extra of item.extras || []) {
      extras.set(extra.id, extra.name);
      names.set(extra.id, extra.name);
      for (const alias of EXTRA_ALSO_BLOCKS[extra.id] || []) names.set(alias, extra.name);
    }
  }
  return { sauces, extras, names };
}

const CATALOG = collect();

export function stockRows(): StockRow[] {
  const products: StockRow[] = MENU_ITEMS.map((item) => ({
    id: item.id,
    name: item.name,
    kind: 'product',
  }));
  const sauces: StockRow[] = Array.from(CATALOG.sauces, ([id, name]) => ({ id, name, kind: 'sauce' }));
  const extras: StockRow[] = Array.from(CATALOG.extras, ([id, name]) => ({ id, name, kind: 'extra' }));
  return [...products, ...sauces, ...extras];
}

export function isStockItemId(id: string) {
  return stockRows().some((row) => row.id === id);
}

export function blockedIds(outOfStockIds: string[]) {
  const blocked = new Set<string>(RETIRED_IDS);
  for (const id of outOfStockIds) {
    if (!id) continue;
    blocked.add(id);
    for (const alias of EXTRA_ALSO_BLOCKS[id] || []) blocked.add(alias);
  }
  return blocked;
}

export function cartStockError(items: CartItem[], outOfStockIds: string[]): string | null {
  const blocked = blockedIds(outOfStockIds);
  for (const item of items) {
    if (blocked.has(item.menuItemId)) {
      return `${CATALOG.names.get(item.menuItemId) || item.name} está agotado en esta sucursal`;
    }
    for (const selection of item.selections || []) {
      for (const choice of selection.choices || []) {
        if (blocked.has(choice)) {
          return `${CATALOG.names.get(choice) || 'Esa opción'} está agotada en esta sucursal`;
        }
      }
    }
    for (const extra of item.extras || []) {
      if (blocked.has(extra.id)) {
        return `${CATALOG.names.get(extra.id) || extra.name} está agotado en esta sucursal`;
      }
    }
  }
  return null;
}
