'use client';

import { useEffect, useRef, useState } from 'react';
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
  PauseCircle,
  PlayCircle,
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
import { formatMXN } from '@/lib/pricing';
import { formatPickupAt } from '@/lib/pickup-slots';
import { KitchenShift, notifyKitchenNewOrder } from '@/components/kitchen-shift';
import { ThermalTicket } from '@/components/thermal-ticket';
import { MenuProductImage } from '@/components/menu-product-image';
import { kitchenStatusLabel, viewFromOrder } from '@/lib/order-lifecycle';
import type { Order, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  OrderStatus,
  { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }
> = {
  awaiting_payment: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/40',
  },
  pending: { icon: Receipt, color: 'text-blue-400', bgColor: 'bg-blue-500/15' },
  preparing: { icon: ChefHat, color: 'text-brand-400', bgColor: 'bg-brand-500/15' },
  in_transit: { icon: Bike, color: 'text-yellow-400', bgColor: 'bg-yellow-500/15' },
  delivered: { icon: CheckCircle2, color: 'text-green-400', bgColor: 'bg-green-500/15' },
  cancelled: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/15' },
};

const NEW_ORDER_STATUSES = new Set<OrderStatus>(['pending', 'preparing']);

type StationView = {
  online: boolean;
  shiftActive: boolean;
  autoPrint: boolean;
  printerReady: boolean;
  statusLabel: string;
  printerLabel: string;
  detail: string;
  lastSeenAt: string | null;
  lastPrintAt: string | null;
};

async function postStation(body: {
  shiftActive: boolean;
  autoPrint: boolean;
  event?: 'heartbeat' | 'print' | 'close' | 'end_shift';
}) {
  await fetch('/api/kitchen/station', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
    keepalive: body.event === 'close' || body.event === 'end_shift',
  }).catch(() => null);
}

export default function KitchenDashboardPage() {
  const { outOfStockIds, toggleOutOfStock } = useOrders();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [shiftActive, setShiftActive] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [station, setStation] = useState<StationView | null>(null);
  const [opsOk, setOpsOk] = useState<boolean | null>(null);
  const [opsProblems, setOpsProblems] = useState<
    { severity: string; label: string; detail: string }[]
  >([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const printQueueRef = useRef<string[]>([]);
  const shiftActiveRef = useRef(false);
  const autoPrintRef = useRef(true);

  shiftActiveRef.current = shiftActive;
  autoPrintRef.current = autoPrint;

  const handleShiftChange = (active: boolean) => {
    if (!active && shiftActiveRef.current) {
      void postStation({
        shiftActive: false,
        autoPrint: false,
        event: 'end_shift',
      });
    }
    setShiftActive(active);
  };

  const enqueuePrint = (orderId: string) => {
    if (printQueueRef.current.includes(orderId)) return;
    printQueueRef.current.push(orderId);
    setPrintingOrderId((current) => {
      if (current) return current;
      return printQueueRef.current.shift() ?? null;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch('/api/kitchen/orders', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const nextOrders = (payload.orders || []) as Order[];
      if (cancelled) return;
      const nextIds = new Set(nextOrders.map((order) => order.id));
      const isFirstLoad = knownIdsRef.current.size === 0;
      if (!isFirstLoad) {
        nextOrders.forEach((order) => {
          if (!knownIdsRef.current.has(order.id) && NEW_ORDER_STATUSES.has(order.status)) {
            notifyKitchenNewOrder();
            if (shiftActiveRef.current && autoPrintRef.current) {
              enqueuePrint(order.id);
            }
          }
        });
      }
      knownIdsRef.current = nextIds;
      setOrders(nextOrders);
    };
    void load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!shiftActive) {
      setStation((prev) =>
        prev
          ? {
              ...prev,
              online: false,
              shiftActive: false,
              printerReady: false,
              statusLabel: 'Cocina cerrada',
              printerLabel: 'Impresora no lista (panel offline)',
              detail: 'Inicia el turno para activar alertas e impresión.',
            }
          : prev
      );
      return;
    }

    let cancelled = false;
    const beat = async () => {
      await postStation({
        shiftActive: true,
        autoPrint: autoPrintRef.current,
        event: 'heartbeat',
      });
      const status = await fetch('/api/kitchen/station', { cache: 'no-store', credentials: 'include' });
      if (!status.ok || cancelled) return;
      const payload = await status.json();
      if (payload.station) setStation(payload.station as StationView);
    };

    void beat();
    const interval = window.setInterval(beat, 15000);

    const onLeave = () => {
      void postStation({
        shiftActive: false,
        autoPrint: false,
        event: 'close',
      });
    };
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [shiftActive]);

  useEffect(() => {
    if (!shiftActive) return;
    void postStation({
      shiftActive: true,
      autoPrint,
      event: 'heartbeat',
    });
  }, [autoPrint, shiftActive]);

  useEffect(() => {
    let cancelled = false;
    const loadOps = async () => {
      const response = await fetch('/api/kitchen/ops-status', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok || cancelled) return;
      const payload = await response.json();
      if (cancelled) return;
      setOpsOk(Boolean(payload.ok));
      setOpsProblems(Array.isArray(payload.problems) ? payload.problems : []);
    };
    void loadOps();
    const interval = window.setInterval(loadOps, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!printingOrderId) return;
    const onAfterPrint = () => {
      void postStation({
        shiftActive: shiftActiveRef.current,
        autoPrint: autoPrintRef.current,
        event: 'print',
      });
      setPrintingOrderId(printQueueRef.current.shift() ?? null);
    };
    window.addEventListener('afterprint', onAfterPrint);
    const timer = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printingOrderId]);

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled');

  const handlePrint = (orderId: string) => {
    setPrintingOrderId(orderId);
  };

  const patchOrderLocal = (orderId: string, order: Order) => {
    setOrders((prev) => prev.map((item) => (item.id === orderId ? order : item)));
  };

  const handleCookHold = async (order: Order, hold: boolean) => {
    const response = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookHold: hold }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.order) patchOrderLocal(order.id, payload.order as Order);
  };

  /** Emergencia: forzar listo (pickup) o entregado si el auto-avance falló. */
  const handleEmergencyStatus = async (order: Order, status: OrderStatus) => {
    const response = await fetch(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.order) patchOrderLocal(order.id, payload.order as Order);
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;
    const order = orders.find((item) => item.id === cancelOrderId);
    if (order?.stripePaymentIntentId) {
      await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: order.stripePaymentIntentId }),
      });
    } else {
      await fetch(`/api/orders/${cancelOrderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }
    setOrders((prev) =>
      prev.map((item) => (item.id === cancelOrderId ? { ...item, status: 'cancelled' } : item))
    );
    setCancelOrderId(null);
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Cocina / emergencia</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor opcional. El ticket sale solo; el pedido avanza con IANGEL o el timer de recoger.
            </p>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground hover:text-white"
            onClick={async () => {
              await fetch('/api/kitchen/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
          >
            Salir
          </button>
        </div>
      </div>

      <div className="mb-6">
        <KitchenShift onShiftChange={handleShiftChange} />
        {shiftActive && (
          <label className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-white">
            <span>Imprimir comanda automáticamente al pagar</span>
            <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
          </label>
        )}
        <div
          className={cn(
            'mt-3 rounded-lg border px-3 py-3 text-sm',
            station?.printerReady
              ? 'border-emerald-700/50 bg-emerald-950/40 text-emerald-100'
              : 'border-amber-700/50 bg-amber-950/40 text-amber-100'
          )}
        >
          <p className="font-semibold">
            {station?.statusLabel || (shiftActive ? 'Conectando estación…' : 'Cocina cerrada')}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {station?.printerLabel ||
              (shiftActive
                ? 'Esperando confirmación de impresión automática…'
                : 'Inicia el turno para activar panel e impresión.')}
          </p>
          <p className="mt-1 text-xs opacity-80">
            {station?.detail ||
              'Si cierras esta pestaña, Angel y el dueño reciben un correo de alerta.'}
          </p>
          <p className="mt-2 text-[11px] opacity-70">
            Nota: el navegador no puede ver si la térmica tiene papel; sí detecta si el panel y la
            impresión automática están activos.
          </p>
        </div>
        {opsOk !== null && (
          <div
            className={cn(
              'mt-3 rounded-lg border px-3 py-2 text-xs',
              opsOk && opsProblems.length === 0
                ? 'border-emerald-700/40 bg-emerald-950/30 text-emerald-100'
                : opsOk
                  ? 'border-amber-700/40 bg-amber-950/30 text-amber-100'
                  : 'border-red-700/40 bg-red-950/30 text-red-100'
            )}
          >
            <p className="font-semibold">
              {opsOk && opsProblems.length === 0
                ? 'Sistema OK (pagos / DB / envío)'
                : opsOk
                  ? 'Sistema con avisos'
                  : 'Sistema con fallo crítico'}
            </p>
            {opsProblems.slice(0, 4).map((p) => (
              <p key={`${p.label}-${p.detail}`} className="mt-1 opacity-90">
                [{p.severity}] {p.label}: {p.detail}
              </p>
            ))}
          </div>
        )}
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
              const statusLabel = kitchenStatusLabel(order.status, order.fulfillment);
              return (
                <div
                  key={order.id}
                  className={cn(
                    'rounded-2xl border border-border/60 bg-card p-4 transition-all',
                    (order.status === 'pending' || order.status === 'preparing') && 'border-blue-500/30',
                    order.cookHold && 'border-yellow-500/40'
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-white">#{order.shortCode || order.id.slice(0, 8)}</span>
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
                      {order.cookHold ? 'En espera' : statusLabel}
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
                      {order.fulfillment === 'pickup' ? (
                        <>
                          <p className="font-semibold text-white">Recoger en tienda</p>
                          {order.pickupAt && <p>Hora: {formatPickupAt(order.pickupAt)}</p>}
                        </>
                      ) : (
                        <>
                          <p>{order.customer.address}</p>
                          {order.customer.references && <p className="text-xs">{order.customer.references}</p>}
                        </>
                      )}
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
                        {item.extras?.map((extra) => (
                          <p key={extra.id} className="pl-3 text-xs text-brand-400">
                            + Extra {extra.name}
                          </p>
                        ))}
                        {item.removals && item.removals.length > 0 && (
                          <p className="pl-3 text-xs text-muted-foreground">
                            Sin {item.removals.join(', ').toLowerCase()}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="pl-3 text-xs italic text-yellow-400/80">"{item.specialInstructions}"</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {order.pickupPin ? (
                    <p className="mb-2 text-xs font-semibold tracking-widest text-brand-400">
                      PIN recojo {order.pickupPin}
                    </p>
                  ) : null}
                  <p className="mb-2 text-xs text-yellow-400">
                    IANGEL: {viewFromOrder({
                      status: order.status,
                      dispatchStatus: order.dispatchStatus,
                      fulfillment: order.fulfillment,
                      cookHold: order.cookHold,
                      leaveAtDoor: order.leaveAtDoor,
                      incidentType: order.incidentType,
                    }).riderLabel}
                  </p>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-brand-500">{formatMXN(order.total)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                      <Button
                        onClick={() => handleCookHold(order, !order.cookHold)}
                        size="sm"
                        variant="outline"
                        className={cn(
                          'border-border bg-card',
                          order.cookHold && 'border-yellow-500/40 text-yellow-400'
                        )}
                      >
                        {order.cookHold ? (
                          <>
                            <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
                            Reanudar
                          </>
                        ) : (
                          <>
                            <PauseCircle className="mr-1.5 h-3.5 w-3.5" />
                            Pausar
                          </>
                        )}
                      </Button>
                    ) : null}
                    {order.fulfillment === 'pickup' && order.status === 'preparing' ? (
                      <Button
                        onClick={() => handleEmergencyStatus(order, 'in_transit')}
                        size="sm"
                        variant="outline"
                        className="border-border bg-card"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Listo ahora
                      </Button>
                    ) : null}
                    {order.fulfillment === 'pickup' && order.status === 'in_transit' ? (
                      <Button
                        onClick={() => handleEmergencyStatus(order, 'delivered')}
                        size="sm"
                        variant="outline"
                        className="border-border bg-card"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Ya recogió
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => handlePrint(order.id)}
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
                            Se hará un reembolso Stripe (reverse_transfer + application fee) y el pedido quedará cancelado.
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

                  <ThermalTicket order={order} active={printingOrderId === order.id} />
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
                    <span className={cn('text-xs font-semibold', statusCfg.color)}>
                      {kitchenStatusLabel(order.status, order.fulfillment)}
                    </span>
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
                      <MenuProductImage src={item.image} alt={item.name} sizes="32px" />
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
