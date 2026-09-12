'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { readGiftRedeem } from '@/lib/gift-checkout';
import { resolveGiftCart } from '@/lib/gift-cart';
import { calcWebPrice, formatMXN } from '@/lib/pricing';
import { useFulfillment } from '@/lib/fulfillment-context';

export function FloatingCartBar() {
  const { items, itemCount } = useCart();
  const { mode } = useFulfillment();

  if (itemCount === 0) return null;

  const gift = resolveGiftCart({
    flagged: readGiftRedeem() === 'jumbo',
    items,
    fulfillment: mode,
  });
  const total = calcWebPrice(gift.chargedBase);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-in-bottom px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/checkout"
          className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-white shadow-2xl shadow-brand-500/30 transition-all hover:bg-brand-600 active:scale-[0.98] sm:px-5 sm:py-3.5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-600">
                {itemCount}
              </span>
            </div>
            <span className="truncate font-semibold">Ver carrito</span>
          </div>
          <span className="shrink-0 text-base font-bold sm:text-lg">{formatMXN(total)}</span>
        </Link>
      </div>
    </div>
  );
}
