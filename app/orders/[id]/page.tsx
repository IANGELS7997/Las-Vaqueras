'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  CheckCircle2,
  Receipt,
  ChefHat,
  Bike,
  Home,
  Clock,
  MapPin,
  Phone,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { useOrders } from '@/lib/orders-context';
import { useCart } from '@/lib/cart-context';
import { calcCartItemPrice, formatMXN } from '@/lib/pricing';
import type { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { status: 'recibido', label: 'Recibido', icon: Receipt },
  { status: 'en_cocina', label: 'En Cocina', icon: ChefHat },
  { status: 'en_camino', label: 'En Camino', icon: Bike },
  { status: 'entregado', label: 'Entregado', icon: Home },
];

const STATUS_ORDER: OrderStatus[] = ['recibido', 'en_cocina', 'en_camino', 'entregado'];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { getOrder, updateOrderStatus } = useOrders();
  const { lastOrder } = useCart();

  const orderId = params.id as string;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const order = mounted ? (getOrder(orderId) || lastOrder) : null;

  useEffect(() => {
    if (!mounted || !order || order.status === 'entregado' || order.status === 'cancelado') return;

    const currentIndex = STATUS_ORDER.indexOf(order.status);
    if (currentIndex < 0 || currentIndex >= STATUS_ORDER.length - 1) return;

    const timer = setTimeout(() => {
      const nextStatus = STATUS_ORDER[currentIndex + 1];
      updateOrderStatus(order.id, nextStatus);
    }, 15000);

    return () => clearTimeout(timer);
  }, [mounted, order, updateOrderStatus]);

  if (!mounted) {
    return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Cargando...</div>;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-white">Pedido no encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">No pudimos encontrar este pedido.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 flex items-center gap-1.5 mx-auto text-sm text-brand-400 hover:text-brand-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    );
  }

  const currentStepIndex = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === 'cancelado';

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-6">
      <button
        onClick={() => router.push('/')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </button>

      <div className="mb-6 text-center animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white">Seguimiento del pedido</h1>
        <p className="mt-1 text-sm text-muted-foreground">Orden #{order.id}</p>
      </div>

      {isCancelled ? (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-lg font-bold text-red-400">Pedido cancelado</p>
          <p className="mt-1 text-sm text-muted-foreground">Tu pedido ha sido cancelado y el reembolso ha sido procesado.</p>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;
              return (
                <div key={step.status} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full items-center">
                    {index > 0 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 transition-colors duration-500',
                          isCompleted || isCurrent ? 'bg-brand-500' : 'bg-border'
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500',
                        isCompleted && 'border-brand-500 bg-brand-500 text-white',
                        isCurrent && 'border-brand-500 bg-brand-500/20 text-brand-400',
                        !isCompleted && !isCurrent && 'border-border bg-card text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className={cn('h-5 w-5', isCurrent && 'animate-pulse')} />
                      )}
                    </div>
                    {index < STATUS_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'h-0.5 flex-1 transition-colors duration-500',
                          isCompleted ? 'bg-brand-500' : 'bg-border'
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCurrent ? 'text-brand-400' : isCompleted ? 'text-white' : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-4 py-2.5">
            <Clock className="h-4 w-4 text-brand-500" />
            <span className="text-sm text-muted-foreground">
              Tiempo estimado: <span className="font-semibold text-white">~{order.estimatedMinutes} min</span>
            </span>
          </div>
        </div>
      )}

      {/* Delivery info */}
      <div className="mb-4 rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <MapPin className="h-4 w-4 text-brand-500" />
          Dirección de entrega
        </h2>
        <p className="text-sm text-white">{order.customer.address}</p>
        {order.customer.references && (
          <p className="mt-1 text-xs text-muted-foreground">{order.customer.references}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3.5 w-3.5 text-brand-500" />
          {order.customer.name} · {order.customer.phone}
        </div>
      </div>

      {/* Order items */}
      <div className="mb-4 rounded-2xl border border-border/60 bg-card p-4">
        <h2 className="mb-3 text-sm font-bold text-white">Detalle del pedido</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.uid} className="flex items-start gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                {item.selections.map((sel) =>
                  sel.choices.length > 0 ? (
                    <p key={sel.optionGroupId} className="text-xs text-muted-foreground">
                      {sel.optionGroupId_label}: {sel.choices.join(', ')}
                    </p>
                  ) : null
                )}
                {item.comboUpgrade && (
                  <p className="text-xs text-brand-400">{item.comboUpgrade.name}</p>
                )}
              </div>
              <span className="text-sm font-semibold text-white">
                {formatMXN(calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base) * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="text-white">{formatMXN(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Cargo por servicio</span>
            <span className="text-white">{formatMXN(order.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Envío</span>
            <span className="text-white">{formatMXN(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span className="text-white">Total pagado</span>
            <span className="text-brand-500">{formatMXN(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
