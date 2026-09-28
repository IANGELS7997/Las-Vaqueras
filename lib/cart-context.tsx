'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { CartItem, Order } from '@/types';
import { cancelCartSignal, scheduleCartSignal } from '@/lib/dev-signal-client';

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
  const armCartSignal = useRef(false);

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

  useEffect(() => {
    if (!hydrated || !armCartSignal.current) return;
    armCartSignal.current = false;
    scheduleCartSignal(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    armCartSignal.current = true;
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback((uid: string, updates: Partial<CartItem>) => {
    armCartSignal.current = true;
    setItems((prev) => prev.map((item) => (item.uid === uid ? { ...item, ...updates } : item)));
  }, []);

  const removeItem = useCallback((uid: string) => {
    armCartSignal.current = true;
    setItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const clearCart = useCallback(() => {
    armCartSignal.current = false;
    cancelCartSignal();
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
