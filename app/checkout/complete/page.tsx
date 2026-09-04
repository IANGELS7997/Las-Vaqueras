'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import type { CartItem, Order, OrderCustomer } from '@/types';
import { Suspense } from 'react';

const PENDING_KEY = 'lv_pending_checkout';

function CompleteCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart, setLastOrder } = useCart();
  const [error, setError] = useState('');

  useEffect(() => {
    const paymentIntentId = searchParams.get('payment_intent');
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!paymentIntentId || !raw) {
      setError('No encontramos el pago pendiente.');
      return;
    }

    const pending = JSON.parse(raw) as {
      customer: OrderCustomer;
      items: CartItem[];
      paymentIntentId: string;
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        customer: pending.customer,
        items: pending.items,
      }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'No se pudo guardar el pedido');
        const order = payload.order as Order;
        sessionStorage.removeItem(PENDING_KEY);
        setLastOrder(order);
        clearCart();
        router.replace(`/orders/${order.id}`);
      })
      .catch((err: Error) => setError(err.message));
  }, [clearCart, router, searchParams, setLastOrder]);

  if (error) {
    return <p className="text-center text-red-400">{error}</p>;
  }

  return (
    <p className="flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Confirmando tu pago...
    </p>
  );
}

export default function CheckoutCompletePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <Suspense
        fallback={
          <p className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </p>
        }
      >
        <CompleteCheckout />
      </Suspense>
    </div>
  );
}
