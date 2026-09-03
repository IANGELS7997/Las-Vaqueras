'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ChefHat,
  Bike,
  CheckCircle2,
  Receipt,
  Printer,
  XCircle,
  Clock,
  Phone,
  MapPin,
  Package,
  Ban,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/lib/orders-context';
import { MENU_ITEMS, CATEGORIES } from '@/lib/mock-data';
import { calcCartItemPrice, formatMXN } from '@/lib/pricing';
import { KitchenShift } from '@/components/kitchen-shift';
import { ThermalTicket } from '@/components/thermal-ticket';
import type { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  recibido: { label: 'Recibido', icon: Receipt, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  en_cocina: { label: 'En Cocina', icon: ChefHat, color: 'text-brand-400', bgColor: 'bg-brand-500/15' },
  en_camino: { label: 'En Camino', icon: Bike, color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  entregado: { label: 'Entregado', icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/15' },
  cancelado: { label: 'Cancelado', icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/15' },
};

const NEXT_STATUS: Record<string, OrderStatus> = {
  recibido: 'en_cocina',
  en_cocina: 'en_camino',
  en_camino: 'entregado',
};

export default function KitchenDashboardPage() {
  const { orders, updateOrderStatus, outOfStockIds, toggleOutOfStock } = useOrders();
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado');
  const completedOrders = orders.filter((o) => o.status === 'entregado' || o.status === 'cancelado');

  const handlePrint = () => {
    window.print();
  };

  const handleAdvanceStatus = (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (next) updateOrderStatus(order.id, next);
  };

  const handleCancelOrder = () => {
    if (cancelOrderId) {
      updateOrderStatus(cancelOrderId, 'cancelado');
      setCancelOrderId(null);
    }
  };

  const getTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Hace ${hours}h ${mins % 60}m`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-12 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cocina / POS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestión de pedidos y control de inventario</p>
      </div>

      <div className="mb-6">
        <KitchenShift />
      </div>

      {/* Active orders */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Clock className="h-5 w-5 text-brand-500" />
            Pedidos activos
            {activeOrders.length > 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                {activeOrders.length}
              </span>
            )}
          </h2>
        </div>

        {activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay pedidos activos</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeOrders.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status];
              const StatusIcon = statusCfg.icon;
              return (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-2xl border border-border/60 bg-card p-4 transition-all',
                    order.status === 'recibido' && 'border-blue-500/30'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white">#{order.id}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{getTimeAgo(order.createdAt)}</span>
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        statusCfg.bgColor,
                        statusCfg.color
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {statusCfg.label}
                    </div>
                  </div>

                  <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <div>
                      <p className="text-white">{order.customer.name}</p>
                      <p>{order.customer.phone}</p>
                    </div>
                  </div>
                  <div className="mb-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                    <div>
                      <p>{order.customer.address}</p>
                      {order.customer.references && <p className="text-xs">{order.customer.references}</p>}
                    </div>
                  </div>

                  <div className="mb-3 space-y-2 rounded-lg bg-secondary/40 p-3">
                    {order.items.map((item) => (
                      <div key={item.uid} className="text-sm">
                        <p className="font-medium text-white">
                          {item.quantity}x {item.name}
                        </p>
                        {item.selections.map((sel) =>
                          sel.choices.length > 0 ? (
                            <p key={sel.optionGroupId} className="pl-3 text-xs text-muted-foreground">
                              → {sel.choices.join(', ')}
                            </p>
                          ) : null
                        )}
                        {item.comboUpgrade && (
                          <p className="pl-3 text-xs text-brand-400">+ {item.comboUpgrade.name}</p>
                        )}
                        {item.specialInstructions && (
                          <p className="pl-3 text-xs italic text-yellow-400/80">"{item.specialInstructions}"</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-brand-500">{formatMXN(order.total)}</span>
                  </div>

                  <div className="flex gap-2">
                    {NEXT_STATUS[order.status] && (
                      <Button
                        onClick={() => handleAdvanceStatus(order)}
                        size="sm"
                        className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Avanzar a {STATUS_CONFIG[NEXT_STATUS[order.status]].label}
                      </Button>
                    )}
                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      size="sm"
                      className="border-border bg-card"
                    >
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Imprimir
                    </Button>
                    <AlertDialog
                      open={cancelOrderId === order.id}
                      onOpenChange={(open) => !open && setCancelOrderId(null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => setCancelOrderId(order.id)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-border/60 bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">¿Cancelar pedido #{order.id}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se simulará un reembolso automático al cliente. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border bg-card text-white">
                            No, mantener
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelOrder}
                            className="bg-red-500 text-white hover:bg-red-600"
                          >
                            Sí, cancelar y reembolsar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <ThermalTicket order={order} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed orders */}
      {completedOrders.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Historial ({completedOrders.length})
          </h2>
          <div className="grid gap-2 md:grid-cols-3">
            {completedOrders.slice(0, 9).map((order) => {
              const statusCfg = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">#{order.id}</span>
                    <span className={cn('text-xs font-semibold', statusCfg.color)}>{statusCfg.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{order.customer.name}</p>
                  <p className="text-xs text-brand-500">{formatMXN(order.total)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Out of stock management */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
          <Package className="h-5 w-5 text-brand-500" />
          Control de inventario
        </h2>
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
            <span>Producto</span>
            <span className="text-center">Categoría</span>
            <span className="text-right">Agotado</span>
          </div>
          <div className="space-y-1">
            {MENU_ITEMS.map((item) => {
              const cat = CATEGORIES.find((c) => c.id === item.category);
              const isOOS = outOfStockIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 transition-colors',
                    isOOS ? 'bg-red-500/5' : 'hover:bg-secondary/40'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="32px" />
                    </div>
                    <span className={cn('truncate text-sm', isOOS ? 'text-red-400 line-through' : 'text-white')}>
                      {item.name}
                    </span>
                  </div>
                  <span className="hidden text-center text-xs text-muted-foreground sm:block sm:w-28">
                    {cat?.name}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    {isOOS && <span className="text-xs font-semibold text-red-400">Agotado</span>}
                    <Switch checked={isOOS} onCheckedChange={() => toggleOutOfStock(item.id)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
