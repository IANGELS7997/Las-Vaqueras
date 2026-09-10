'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
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
  } | null>(null);
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
          <div className="mt-6 space-y-4">
            <button type="button" className="text-sm text-orange-400" onClick={() => setShowPromos(false)}>
              Volver al perfil
            </button>
            <h3 className="text-sm font-bold text-white">Mis promociones</h3>
            <p className="text-sm text-muted-foreground">{loyalty?.cycleLabel || 'Pedido 1 de 10'}</p>
            <p className="text-sm text-brand-400">{loyalty?.nextLabel || 'Sigue pidiendo para desbloquear beneficios'}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>1.er pedido: 30% en comida</li>
              <li>5.º pedido: 20% en comida</li>
              <li>10.º pedido: Papas Jumbo de regalo</li>
            </ul>
            <PwaInstallHint />
          </div>
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
