'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import type { MenuItem } from '@/types';
import { calcWebPrice, formatMXN } from '@/lib/pricing';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  outOfStock?: boolean;
}

const categoryLabels: Record<string, string> = {
  papas: 'Papas',
  boneless: 'Boneless',
  combos: 'Burger',
  tortas: 'Torta',
  bebidas: 'Bebida',
};

export function ProductCard({ item, onAdd, outOfStock }: ProductCardProps) {
  const webPrice = calcWebPrice(item.price_base);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10',
        outOfStock && 'opacity-50'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden" onClick={() => !outOfStock && onAdd(item)}>
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-brand-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          <BrandLogo alt="" className="h-4" width={32} height={16} />
          {categoryLabels[item.category]}
        </div>
        {item.serves && (
          <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            {item.serves}
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-bold text-white">
              AGOTADO
            </span>
          </div>
        )}
      </div>

      <div className="p-3.5" onClick={() => !outOfStock && onAdd(item)}>
        <h3 className="text-sm font-bold leading-tight text-white">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-base font-bold text-brand-500">{formatMXN(webPrice)}</span>
          <button
            disabled={outOfStock}
            className="flex items-center gap-1 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              if (!outOfStock) onAdd(item);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
