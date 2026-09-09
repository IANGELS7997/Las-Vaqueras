'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, MENU_ITEMS } from '@/lib/mock-data';
import { useCart } from '@/lib/cart-context';
import { useOrders } from '@/lib/orders-context';
import { ProductCard } from '@/components/product-card';
import { ProductModal } from '@/components/product-modal';
import { FloatingCartBar } from '@/components/floating-cart-bar';
import { Drumstick, Beef, CupSoda, UtensilsCrossed } from 'lucide-react';
import type { MenuItem, CartItem } from '@/types';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useFulfillment } from '@/lib/fulfillment-context';
import { getOpenStatus } from '@/lib/restaurant';

const HERO_PROMOS = [
  { src: '/hero/hero-1.jpg', alt: 'Qué tal una torta' },
  { src: '/hero/hero-2.jpg', alt: 'Una burger' },
  { src: '/hero/hero-3.jpg', alt: 'Y unas papas' },
] as const;

function CategoryLogo({ className }: { className?: string }) {
  return <BrandLogo alt="" className={className} width={32} height={16} />;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame: CategoryLogo,
  Drumstick,
  Beef,
  CupSoda,
};

export default function MenuPage() {
  const router = useRouter();
  const { ready, mode, browseOnly } = useFulfillment();
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('combos');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { addItem } = useCart();
  const { outOfStockIds } = useOrders();

  useEffect(() => {
    const update = () => setIsOpen(getOpenStatus().isOpen);
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!ready || isOpen === null) return;
    const mustChooseFulfillment = isOpen && !mode && !browseOnly;
    if (mustChooseFulfillment) {
      router.replace('/');
    }
  }, [ready, isOpen, mode, browseOnly, router]);

  const showingMenu = ready && isOpen !== null && !(isOpen && !mode && !browseOnly);
  const viewOnly = browseOnly || isOpen === false;
  const didResetScroll = useRef(false);

  useLayoutEffect(() => {
    if (!showingMenu || didResetScroll.current) return;
    didResetScroll.current = true;
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const scrollTop = () => window.scrollTo(0, 0);
    scrollTop();
    const frame = requestAnimationFrame(() => {
      scrollTop();
      requestAnimationFrame(scrollTop);
    });
    const timers = [50, 150, 350].map((ms) => window.setTimeout(scrollTop, ms));
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      history.scrollRestoration = previous;
    };
  }, [showingMenu]);

  const filteredItems = MENU_ITEMS.filter((item) => item.category === activeCategory);

  const handleCardClick = (item: MenuItem) => {
    if (viewOnly) return;
    const needsModal =
      (item.optionGroups && item.optionGroups.length > 0) ||
      (item.comboUpgrades && item.comboUpgrades.length > 0) ||
      (item.extras && item.extras.length > 0) ||
      (item.removals && item.removals.length > 0);

    if (needsModal) {
      setModalItem(item);
      setModalOpen(true);
    } else {
      const cartItem: CartItem = {
        uid: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        menuItemId: item.id,
        name: item.name,
        image: item.image,
        price_base: item.price_base,
        quantity: 1,
        selections: [],
      };
      addItem(cartItem);
    }
  };

  if (!ready || isOpen === null || (isOpen && !mode && !browseOnly)) {
    return <div className="min-h-[40vh]" />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6">
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        {HERO_PROMOS.map((promo, index) => (
          <div
            key={promo.src}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border/50"
          >
            <Image
              src={promo.src}
              alt={promo.alt}
              fill
              priority
              className={cn('hero-promo-shot object-cover', `hero-promo-shot--${index}`)}
              sizes="(max-width: 640px) 33vw, 280px"
            />
          </div>
        ))}
      </div>

      <div className="mb-6 text-center animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Las papas vaqueras mas famosas de <span className="text-brand-500">Chihuahua</span>
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {viewOnly
            ? 'Estamos cerrados. Puedes ver el menú; el pedido se habilita al abrir.'
            : 'Papas Vaqueras, Boneless, Hamburguesas y más.'}
        </p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const Icon = iconMap[cat.icon] || UtensilsCrossed;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all',
                activeCategory === cat.id
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-card text-muted-foreground hover:bg-secondary'
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 animate-fade-in">
        {filteredItems.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onAdd={handleCardClick}
            outOfStock={outOfStockIds.includes(item.id)}
            closed={viewOnly}
          />
        ))}
      </div>

      <ProductModal
        item={modalItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={addItem}
      />

      {!viewOnly && <FloatingCartBar />}
    </div>
  );
}
