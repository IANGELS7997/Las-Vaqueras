'use client';

import { useState } from 'react';
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

function CategoryLogo({ className }: { className?: string }) {
  return <BrandLogo alt="" className={className} width={32} height={16} />;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame: CategoryLogo,
  Drumstick,
  Beef,
  CupSoda,
};

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>('papas');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { addItem } = useCart();
  const { outOfStockIds } = useOrders();

  const filteredItems = MENU_ITEMS.filter((item) => item.category === activeCategory);

  const handleCardClick = (item: MenuItem) => {
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

  const handleModalConfirm = (cartItem: CartItem) => {
    addItem(cartItem);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-6">
      <div className="mb-6 text-center animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Pide a domicilio en <span className="text-brand-500">Chihuahua</span>
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Papas Vaqueras, Boneless, Hamburguesas y más. Entrega rápida a tu puerta.
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
          />
        ))}
      </div>

      <ProductModal
        item={modalItem}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleModalConfirm}
      />

      <FloatingCartBar />
    </div>
  );
}
