'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, ArrowLeft, CreditCard, Loader2, MapPin, User } from 'lucide-react';
import { CheckoutPayment } from '@/components/checkout-payment';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  calcCartBaseTotal,
  calcCartItemPrice,
  DELIVERY_FEE,
  formatMXN,
  SERVICE_FEE_RATE,
} from '@/lib/pricing';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';

const PENDING_KEY = 'lv_pending_checkout';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, clearCart, setLastOrder } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [references, setReferences] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [payError, setPayError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');

  const priceBaseTotal = calcCartBaseTotal(items);
  const split = calcCheckoutSplit({ priceBaseTotal, deliveryFee: DELIVERY_FEE });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!phone.trim()) e.phone = 'El teléfono es obligatorio';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Teléfono inválido (mín. 10 dígitos)';
    if (!address.trim()) e.address = 'La dirección es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const startPayment = async () => {
    if (items.length === 0) return;
    if (!validate()) return;
    setCreatingIntent(true);
    setPayError('');

    const customer = { name, phone, address, references };
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceBaseTotal,
        deliveryFee: DELIVERY_FEE,
        stripeAccountId: process.env.NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID,
        customer,
      }),
    });
    const payload = await response.json();
    setCreatingIntent(false);

    if (!response.ok) {
      setPayError(payload.error || 'No se pudo iniciar el pago');
      return;
    }

    const pending = {
      customer,
      items,
      paymentIntentId: payload.id as string,
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    setPaymentIntentId(payload.id);
    setClientSecret(payload.clientSecret);
  };

  const handlePaid = (order: Order) => {
    sessionStorage.removeItem(PENDING_KEY);
    setLastOrder(order);
    clearCart();
    router.push(`/orders/${order.id}`);
  };

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-white">Tu carrito está vacío</p>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos para continuar.</p>
        <Button onClick={() => router.push('/')} className="mt-6 bg-brand-500 text-white hover:bg-brand-600">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
      <button
        onClick={() => router.push('/')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Seguir pidiendo
      </button>

      <h1 className="mb-6 text-2xl font-bold text-white">Checkout</h1>

      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-white">Tu pedido ({items.length} items)</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.uid} className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
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
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-white">
                      {formatMXN(calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base) * item.quantity)}
                    </span>
                    {!clientSecret && (
                      <button
                        onClick={() => removeItem(item.uid)}
                        className="text-muted-foreground transition-colors hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
              <User className="h-4 w-4 text-brand-500" />
              Información de entrega
            </h2>
            <div className="grid gap-3">
              <div>
                <Label className="mb-1.5">Nombre completo</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={Boolean(clientSecret)}
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
              </div>
              <div>
                <Label className="mb-1.5">Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 614 ..."
                  disabled={Boolean(clientSecret)}
                  className={cn(errors.phone && 'border-red-500')}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
              </div>
              <div>
                <Label className="mb-1.5">Dirección de entrega</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, colonia"
                  disabled={Boolean(clientSecret)}
                  className={cn(errors.address && 'border-red-500')}
                />
                {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
              </div>
              <div>
                <Label className="mb-1.5">Referencias (opcional)</Label>
                <Textarea
                  value={references}
                  onChange={(e) => setReferences(e.target.value)}
                  placeholder="Ej: casa azul, frente al parque..."
                  className="resize-none"
                  rows={2}
                  disabled={Boolean(clientSecret)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
              <CreditCard className="h-4 w-4 text-brand-500" />
              Pago
            </h2>
            {clientSecret ? (
              <CheckoutPayment
                clientSecret={clientSecret}
                pending={{
                  customer: { name, phone, address, references },
                  items,
                  paymentIntentId,
                }}
                onPaid={handlePaid}
              />
            ) : (
              <div>
                {payError && <p className="mb-3 text-sm text-red-400">{payError}</p>}
                <Button
                  onClick={startPayment}
                  disabled={creatingIntent}
                  className="w-full bg-brand-500 text-white hover:bg-brand-600"
                  size="lg"
                >
                  {creatingIntent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparando pago...
                    </>
                  ) : (
                    'Continuar al pago seguro'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-white">Resumen del pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal (precio web)</span>
                <span className="text-white">{formatMXN(split.subtotalWeb)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Cargo al cliente ({(SERVICE_FEE_RATE * 100).toFixed(0)}%)</span>
                <span className="text-white">{formatMXN(split.customerFee)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span className="text-white">{formatMXN(split.deliveryFee)}</span>
              </div>
              <Separator className="my-3 bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-500">{formatMXN(split.totalCharged)}</span>
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              El restaurante recibe {formatMXN(split.restaurantPayout)} (92% del menú físico).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
