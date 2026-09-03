'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CartItem, Order } from '@/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateItem: (uid: string, updates: Partial<CartItem>) => void;
  removeItem: (uid: string) => void;
  clearCart: () => void;
  itemCount: number;
  lastOrder: Order | null;
  setLastOrder: (order: Order | null) => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrderState] = useState<Order | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lv_cart');
      if (stored) setItems(JSON.parse(stored));
      const order = localStorage.getItem('lv_last_order');
      if (order) setLastOrderState(JSON.parse(order));
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('lv_cart', JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((uid: string, updates: Partial<CartItem>) => {
    setItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((uid: string) => {
    setItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const setLastOrder = useCallback((order: Order | null) => {
    setLastOrderState(order);
    if (order) {
      localStorage.setItem('lv_last_order', JSON.stringify(order));
    } else {
      localStorage.removeItem('lv_last_order');
    }
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateItem, removeItem, clearCart, itemCount, lastOrder, setLastOrder }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
