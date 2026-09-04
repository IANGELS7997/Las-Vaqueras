'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Clock, MapPin, Package, Phone } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';
import { calcCartLineWeb, formatMXN } from '@/lib/pricing';
import type { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

const STEPS: OrderStatus[] = ['pending', 'preparing', 'in_transit', 'delivered'];
const STEP_LABELS = ['Recibido', 'En Cocina', 'En Camino', 'Entregado'];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && ['pending', 'preparing', 'in_transit', 'delivered', 'cancelled'].includes(value);
}

export default function OrderTracking({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { lastOrder } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const response = await fetch(`/api/orders/${params.id}`);
      if (response.ok) {
        const payload = await response.json();
        const nextOrder = payload.order as Order;
        if (!cancelled) {
          setOrder(nextOrder);
          setStatus(nextOrder.status);
        }
      } else if (!cancelled && lastOrder?.id === params.id) {
        setOrder(lastOrder);
        setStatus(lastOrder.status);
      }
      if (!cancelled) setLoading(false);
    };

    void load();

    if (!supabase) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel(`order-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          const nextStatus = payload.new?.status;
          if (isOrderStatus(nextStatus)) {
            setStatus(nextStatus);
            setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [lastOrder, params.id]);

  const currentStep = STEPS.indexOf(status);
  const isCancelled = status === 'cancelled';
  const progressWidth =
    currentStep <= 0 ? '0%' : `${(currentStep / (STEPS.length - 1)) * 100}%`;

  if (loading) {
    return (
      <div className="mx-auto min-h-[50vh] max-w-md px-6 py-20 text-center text-muted-foreground">
        Cargando rastreo...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-white">Pedido no encontrado</p>
        <button
          onClick={() => router.push('/')}
          className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-orange-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 pb-12 pt-6 text-white">
      <button
        onClick={() => router.push('/')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-orange-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-orange-500">Rastreo de Pedido</h2>
        <p className="text-sm text-muted-foreground">Orden #{order.id.slice(0, 8)}</p>
      </div>

      {isCancelled ? (
        <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-lg font-bold text-red-400">Pedido cancelado</p>
          <p className="mt-1 text-sm text-muted-foreground">El reembolso ya fue procesado.</p>
        </div>
      ) : (
        <div className="relative my-8 flex items-center justify-between">
          <div className="absolute left-4 right-4 top-4 h-0.5 bg-neutral-800" />
          <div
            className="absolute left-4 top-4 h-0.5 bg-orange-500 transition-all duration-500"
            style={{ width: progressWidth }}
          />
          {STEP_LABELS.map((label, idx) => (
            <div key={label} className="z-10 flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  idx <= currentStep ? 'bg-orange-500 text-black' : 'bg-neutral-800 text-gray-500'
                )}
              >
                {idx + 1}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs',
                  idx <= currentStep ? 'font-semibold text-white' : 'text-gray-500'
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {!isCancelled && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5">
          <Clock className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-muted-foreground">
            Tiempo estimado: <span className="font-semibold text-white">~{order.estimatedMinutes} min</span>
          </span>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-orange-500" />
          Dirección de entrega
        </h3>
        <p className="text-sm">{order.customer.address}</p>
        {order.customer.references && (
          <p className="mt-1 text-xs text-muted-foreground">{order.customer.references}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 text-orange-500" />
          {order.customer.name} · {order.customer.phone}
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left">
        <h3 className="mb-3 text-sm font-bold">Detalle del pedido</h3>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.uid} className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                {item.extras?.map((extra) => (
                  <p key={extra.id} className="text-xs text-muted-foreground">
                    + {extra.name}
                  </p>
                ))}
                {item.removals && item.removals.length > 0 && (
                  <p className="text-xs text-muted-foreground">Sin {item.removals.join(', ').toLowerCase()}</p>
                )}
                {item.comboUpgrade && (
                  <p className="text-xs text-muted-foreground">{item.comboUpgrade.name}</p>
                )}
              </div>
              <span className="text-sm font-semibold">
                {formatMXN(calcCartLineWeb(item))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-neutral-800 pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-white">{formatMXN(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Cargo al cliente (4%)</span>
            <span className="text-white">{formatMXN(order.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Envío</span>
            <span className="text-white">{formatMXN(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total pagado</span>
            <span className="text-orange-500">{formatMXN(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
