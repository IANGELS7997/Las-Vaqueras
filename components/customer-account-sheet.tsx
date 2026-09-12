'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useFulfillment } from '@/lib/fulfillment-context';
import { getMenuItemById } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GIFT_FULFILLMENT_COPY, writeGiftRedeem } from '@/lib/gift-checkout';
import { PwaInstallHint } from '@/components/pwa-install-hint';
import { formatMXN } from '@/lib/pricing';
import type { Order } from '@/types';

type CustomerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
};

const ACTIVE = new Set(['pending', 'preparing', 'in_transit']);

export function CustomerAccountSheet() {
  const router = useRouter();
  const { addItem } = useCart();
  const { mode, setMode } = useFulfillment();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showPromos, setShowPromos] = useState(false);
  const [loyalty, setLoyalty] = useState<{
    paidOrders: number;
    nextOrdinal: number;
    nextLabel: string;
    cycleLabel: string;
    jumboGift?: {
      available: boolean;
      expiresAt: string | null;
      code?: string | null;
      redeemedOrderId?: string | null;
    };
  } | null>(null);
  const [giftIngredients, setGiftIngredients] = useState<string[]>([]);
  const [giftSauce, setGiftSauce] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadMe = async () => {
    const response = await fetch('/api/customer/me');
    if (!response.ok) return;
    const payload = await response.json();
    setCustomer(payload.customer || null);
    setOrders(payload.orders || []);
    setLoyalty(payload.loyalty || null);
  };

  useEffect(() => {
    if (open) void loadMe();
  }, [open]);

  const handleLookup = async () => {
    setLoading(true);
    setError('');
    const response = await fetch('/api/customer/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || 'No se pudo entrar');
      return;
    }
    await loadMe();
  };

  const handleLogout = async () => {
    await fetch('/api/customer/logout', { method: 'POST' });
    setCustomer(null);
    setOrders([]);
    setShowOrders(false);
    setShowPromos(false);
    setLoyalty(null);
    setGiftIngredients([]);
    setGiftSauce('');
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setSavingPhoto(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/customer/avatar', { method: 'POST', body: form });
    const payload = await response.json().catch(() => ({}));
    setSavingPhoto(false);
    if (!response.ok) {
      setError(payload.error || 'No se pudo guardar la foto');
      return;
    }
    setCustomer((prev) => (prev ? { ...prev, avatarUrl: payload.avatarUrl } : prev));
  };

  const initials = customer
    ? `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase()
    : '';
  const activeOrders = orders.filter((order) => ACTIVE.has(order.status));
  const pastOrders = orders.filter((order) => !ACTIVE.has(order.status));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card text-white"
          aria-label="Mi perfil"
        >
          <User className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto border-border bg-background">
        <SheetHeader>
          <SheetTitle className="text-white">Mi perfil</SheetTitle>
          <SheetDescription>
            {customer
              ? 'Tus datos y pedidos de Las Vaqueras'
              : 'Entra con el nombre, apellido y celular de tu compra'}
          </SheetDescription>
        </SheetHeader>

        {!customer ? (
          <form
            className="mt-6 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleLookup();
            }}
          >
            <div>
              <Label>Nombre</Label>
              <Input className="mt-1.5" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input className="mt-1.5" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <Label>Celular</Label>
              <Input
                className="mt-1.5"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="614..."
              />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" className="w-full bg-brand-500 text-white hover:bg-brand-600" disabled={loading}>
              {loading ? 'Buscando…' : 'Ver mi perfil'}
            </Button>
          </form>
        ) : showPromos ? (
          <PromotionsPanel
            loyalty={loyalty}
            orders={orders}
            giftIngredients={giftIngredients}
            giftSauce={giftSauce}
            redeeming={redeeming}
            error={error}
            onBack={() => setShowPromos(false)}
            onToggleIngredient={(id) => {
              setGiftIngredients((prev) => {
                if (prev.includes(id)) return prev.filter((item) => item !== id);
                if (prev.length >= 4) return prev;
                return [...prev, id];
              });
            }}
            onSauce={setGiftSauce}
            onRedeem={async () => {
              const jumbo = getMenuItemById('papas-jumbo');
              if (!jumbo || giftIngredients.length < 1) {
                setError('Elige de 1 a 4 ingredientes');
                return;
              }
              setRedeeming(true);
              setError('');
              const response = await fetch('/api/loyalty/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: loyalty?.jumboGift?.code || '' }),
              });
              const payload = await response.json().catch(() => ({}));
              setRedeeming(false);
              if (!response.ok) {
                setError(payload.error || 'No se pudo canjear');
                return;
              }
              const ingredientNames = (jumbo.optionGroups?.[0]?.choices || [])
                .filter((choice) => giftIngredients.includes(choice.id))
                .map((choice) => choice.name);
              const sauceName = (jumbo.optionGroups?.[1]?.choices || []).find((choice) => choice.id === giftSauce)?.name;
              addItem({
                uid: crypto.randomUUID(),
                menuItemId: jumbo.id,
                name: jumbo.name,
                image: jumbo.image,
                price_base: jumbo.price_base,
                quantity: 1,
                selections: [
                  {
                    optionGroupId: 'papas-jmb-ingredients',
                    optionGroupId_label: 'Elige tus ingredientes',
                    choices: ingredientNames,
                  },
                  ...(sauceName
                    ? [
                        {
                          optionGroupId: 'papas-jmb-boneless-salsa',
                          optionGroupId_label: 'Salsa de boneless',
                          choices: [sauceName],
                        },
                      ]
                    : []),
                ],
                specialInstructions: 'JUMBO REGALO',
              });
              writeGiftRedeem('jumbo');
              if (!mode) setMode('pickup');
              setOpen(false);
              router.push('/checkout');
            }}
          />
        ) : showOrders ? (
          <div className="mt-6 space-y-5">
            <button type="button" className="text-sm text-orange-400" onClick={() => setShowOrders(false)}>
              Volver al perfil
            </button>
            <section>
              <h3 className="mb-2 text-sm font-bold text-white">Activos</h3>
              {activeOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tienes pedidos activos</p>
              ) : (
                <OrderList orders={activeOrders} onOpen={() => setOpen(false)} />
              )}
            </section>
            <section>
              <h3 className="mb-2 text-sm font-bold text-white">Anteriores</h3>
              {pastOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay pedidos anteriores</p>
              ) : (
                <OrderList orders={pastOrders} onOpen={() => setOpen(false)} />
              )}
            </section>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-brand-500 bg-card"
                aria-label="Cambiar foto de perfil"
              >
                {customer.avatarUrl ? (
                  <img src={customer.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                    {initials}
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handlePhoto(event.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">
                {savingPhoto ? 'Guardando foto…' : 'Toca la foto para elegir una de tu galería'}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-white">
                {customer.firstName} {customer.lastName}
              </p>
              <p className="text-muted-foreground">{customer.phone}</p>
              <p className="text-muted-foreground">{customer.email}</p>
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button
              className="w-full bg-brand-500 text-white hover:bg-brand-600"
              onClick={() => setShowPromos(true)}
            >
              Mis promociones
            </Button>
            <Button
              className="w-full bg-brand-500 text-white hover:bg-brand-600"
              onClick={() => setShowOrders(true)}
            >
              Ver mis pedidos
            </Button>
            <Button variant="outline" className="w-full border-border" onClick={() => void handleLogout()}>
              Salir
            </Button>
            <PwaInstallHint />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function PromotionsPanel({
  loyalty,
  orders,
  giftIngredients,
  giftSauce,
  redeeming,
  error,
  onBack,
  onToggleIngredient,
  onSauce,
  onRedeem,
}: {
  loyalty: {
    paidOrders: number;
    nextOrdinal: number;
    nextLabel: string;
    cycleLabel: string;
    jumboGift?: {
      available: boolean;
      expiresAt: string | null;
      code?: string | null;
      redeemedOrderId?: string | null;
    };
  } | null;
  orders: Order[];
  giftIngredients: string[];
  giftSauce: string;
  redeeming: boolean;
  error: string;
  onBack: () => void;
  onToggleIngredient: (id: string) => void;
  onSauce: (id: string) => void;
  onRedeem: () => void;
}) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const jumbo = getMenuItemById('papas-jumbo');
  const ingredients = jumbo?.optionGroups?.[0]?.choices || [];
  const sauces = jumbo?.optionGroups?.[1]?.choices || [];
  const hasGift = Boolean(loyalty?.jumboGift?.available);
  const redeemedOrderId = loyalty?.jumboGift?.redeemedOrderId || '';
  const filled = hasGift ? 10 : loyalty?.paidOrders ? loyalty.paidOrders % 10 : 0;
  const cycleOrders = orders
    .filter((order) => order.status !== 'cancelled' && order.status !== 'awaiting_payment')
    .slice()
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .slice(filled > 0 ? -filled : 0);

  const orderIdForStep = (step: number) => {
    if (step === 10 && redeemedOrderId) return redeemedOrderId;
    return cycleOrders[step - 1]?.id || '';
  };

  return (
    <div className="mt-6 space-y-4">
      <button type="button" className="text-sm text-orange-400" onClick={onBack}>
        Volver al perfil
      </button>
      <h3 className="text-sm font-bold text-white">Mis promociones</h3>
      <p className="text-sm text-muted-foreground">
        {hasGift ? 'Completaste el ciclo de 10. Canjea tu Jumbo.' : loyalty?.cycleLabel || 'Pedido 1 de 10'}
      </p>
      <div className="space-y-4">
        {[
          [1, 2, 3, 4, 5],
          [6, 7, 8, 9, 10],
        ].map((row) => (
          <div key={row[0]} className="relative grid grid-cols-5 items-center gap-2">
            <span
              aria-hidden
              className="absolute left-4 right-4 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-zinc-800"
            />
            {row.map((step) => {
              const done = step <= filled;
              const prize = step === 1 || step === 5 || step === 10;
              return (
                <div key={step} className="relative z-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedStep(step)}
                    className={cn(
                      'flex items-center justify-center font-bold leading-none active:scale-95',
                      prize ? 'h-12 w-12 rounded-xl text-base' : 'h-8 w-8 rounded-lg text-[11px]',
                      done ? 'bg-brand-500 text-white' : 'bg-zinc-900 text-zinc-500',
                      prize && done && 'bg-orange-600',
                      prize && !done && 'border border-orange-500/80 text-orange-400'
                    )}
                  >
                    {step}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Toca un número para ver el pedido o la promoción.</p>

      <StepPeekDialog
        step={selectedStep}
        order={selectedStep ? orders.find((item) => item.id === orderIdForStep(selectedStep)) || null : null}
        hasGift={hasGift}
        giftCode={loyalty?.jumboGift?.code || null}
        onClose={() => setSelectedStep(null)}
      />
      {!hasGift && !redeemedOrderId && loyalty?.nextLabel ? (
        <p className="text-sm text-brand-400">{loyalty.nextLabel}</p>
      ) : null}

      {hasGift ? (
        <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3 space-y-3">
          <p className="text-sm font-semibold text-white">Papas Jumbo de regalo</p>
          {loyalty?.jumboGift?.code ? (
            <p className="text-center font-mono text-2xl font-bold tracking-[0.18em] text-white">
              {loyalty.jumboGift.code}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Código único de tu perfil. Elige ingredientes y canjea. {GIFT_FULFILLMENT_COPY}
          </p>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onToggleIngredient(choice.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs',
                  giftIngredients.includes(choice.id)
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-border text-muted-foreground'
                )}
              >
                {choice.name}
              </button>
            ))}
          </div>
          {giftIngredients.includes('boneless') ? (
            <div className="flex flex-wrap gap-2">
              {sauces.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onSauce(choice.id)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs',
                    giftSauce === choice.id
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {choice.name}
                </button>
              ))}
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <Button className="w-full bg-brand-500 text-white hover:bg-brand-600" onClick={onRedeem} disabled={redeeming}>
            {redeeming ? 'Preparando…' : 'Canjear y pedir'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sigue pidiendo para desbloquear el siguiente beneficio.</p>
      )}
      <PwaInstallHint />
    </div>
  );
}

const STEP_PROMOS: Record<number, { title: string; text: string }> = {
  1: { title: 'Pedido 1', text: '30% de descuento en la comida de este pedido.' },
  5: { title: 'Pedido 5', text: '20% de descuento en la comida de este pedido.' },
  10: { title: 'Pedido 10', text: 'Papas Jumbo de regalo' },
};

function StepPeekDialog({
  step,
  order,
  hasGift,
  giftCode,
  onClose,
}: {
  step: number | null;
  order: Order | null;
  hasGift: boolean;
  giftCode: string | null;
  onClose: () => void;
}) {
  if (step == null) return null;
  const promo = STEP_PROMOS[step];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[22rem] rounded-2xl border border-border bg-zinc-950 p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-white">{promo ? promo.title : `Pedido ${step}`}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {promo ? promo.text : 'Resumen de tu pedido en este paso.'}
            </p>
          </div>
          <button type="button" className="text-sm text-orange-400" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {step === 10 && hasGift && giftCode ? (
          <p className="mb-3 text-center font-mono text-xl font-bold tracking-[0.16em] text-white">{giftCode}</p>
        ) : null}
        {order ? (
          <div className="rounded-xl border border-border/60 bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white">#{order.id.slice(0, 8)}</span>
              <span className="text-xs text-orange-400">{formatMXN(order.total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {order.fulfillment === 'pickup' ? 'Recoger' : 'Domicilio'} · {order.status}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {order.items.slice(0, 4).map((item) => (
                <li key={item.uid}>
                  {item.quantity}× {item.name}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {promo ? 'Esta promoción se activa al llegar a este pedido.' : 'Aún no hay un pedido en este número.'}
          </p>
        )}
      </div>
    </div>
  );
}

function OrderList({ orders, onOpen }: { orders: Order[]; onOpen: () => void }) {
  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          onClick={onOpen}
          className="block rounded-xl border border-border/60 bg-card p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white">#{order.id.slice(0, 8)}</span>
            <span className="text-xs text-orange-400">{formatMXN(order.total)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {order.fulfillment === 'pickup' ? 'Recoger' : 'Domicilio'} · {order.status}
          </p>
        </Link>
      ))}
    </div>
  );
}
