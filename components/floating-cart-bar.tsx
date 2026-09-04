'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { calcCartLineWeb, formatMXN } from '@/lib/pricing';

export function FloatingCartBar() {
  const { items, itemCount } = useCart();

  if (itemCount === 0) return null;

  const total = items.reduce((sum, item) => sum + calcCartLineWeb(item), 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-in-bottom px-4 pb-4">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/checkout"
          className="flex items-center justify-between rounded-2xl bg-brand-500 px-5 py-3.5 text-white shadow-2xl shadow-brand-500/30 transition-all hover:bg-brand-600 active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600">
                {itemCount}
              </span>
            </div>
            <span className="font-semibold">Ver carrito</span>
          </div>
          <span className="text-lg font-bold">{formatMXN(total)}</span>
        </Link>
      </div>
    </div>
  );
}
