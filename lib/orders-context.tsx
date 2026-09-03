'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Order, OrderStatus } from '@/types';

interface OrdersContextValue {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrder: (id: string) => Order | undefined;
  outOfStockIds: string[];
  toggleOutOfStock: (menuItemId: string) => void;
}

const OrdersContext = createContext<OrdersContextValue | undefined>(undefined);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [outOfStockIds, setOutOfStockIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lv_orders');
      if (stored) setOrders(JSON.parse(stored));
      const oos = localStorage.getItem('lv_out_of_stock');
      if (oos) setOutOfStockIds(JSON.parse(oos));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('lv_orders', JSON.stringify(orders));
    }
  }, [orders, hydrated]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('lv_out_of_stock', JSON.stringify(outOfStockIds));
    }
  }, [outOfStockIds, hydrated]);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
  }, []);

  const getOrder = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders]
  );

  const toggleOutOfStock = useCallback((menuItemId: string) => {
    setOutOfStockIds((prev) =>
      prev.includes(menuItemId)
        ? prev.filter((id) => id !== menuItemId)
        : [...prev, menuItemId]
    );
  }, []);

  return (
    <OrdersContext.Provider
      value={{ orders, addOrder, updateOrderStatus, getOrder, outOfStockIds, toggleOutOfStock }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider');
  return ctx;
}
