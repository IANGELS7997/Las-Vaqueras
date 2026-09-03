'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trash2, ArrowLeft, CreditCard, Loader2, CheckCircle2, MapPin, User, Phone } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useOrders } from '@/lib/orders-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { calcCartItemPrice, calcOrderTotal, formatMXN, SERVICE_FEE_RATE, DELIVERY_FEE } from '@/lib/pricing';
import type { Order, PaymentMethod, OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, clearCart, setLastOrder } = useCart();
  const { addOrder } = useOrders();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [references, setReferences] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    return sum + calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base) * item.quantity;
  }, 0);
  const { serviceFee, deliveryFee, total } = calcOrderTotal(subtotal);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'El nombre es obligatorio';
    if (!phone.trim()) e.phone = 'El teléfono es obligatorio';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Teléfono inválido (mín. 10 dígitos)';
    if (!address.trim()) e.address = 'La dirección es obligatoria';
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 15) e.cardNumber = 'Número de tarjeta inválido';
      if (!cardExpiry.trim()) e.cardExpiry = 'Requerido';
      if (cardCvc.length < 3) e.cardCvc = 'CVC inválido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = () => {
    if (items.length === 0) return;
    if (!validate()) return;

    setProcessing(true);

    setTimeout(() => {
      const orderId = `LV-${Date.now().toString().slice(-6)}`;
      const order: Order = {
        id: orderId,
        items: [...items],
        customer: { name, phone, address, references },
        paymentMethod,
        subtotal,
        serviceFee,
        deliveryFee,
        total,
        status: 'recibido' as OrderStatus,
        createdAt: new Date().toISOString(),
        estimatedMinutes: 35,
      };

      addOrder(order);
      setLastOrder(order);
      clearCart();
      setProcessing(false);
      router.push(`/orders/${orderId}`);
    }, 1800);
  };

  if (items.length === 0) {
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
          {/* Order items */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-white">Tu pedido ({items.length} items)</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.uid} className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
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
                    {item.specialInstructions && (
                      <p className="text-xs text-muted-foreground italic">"{item.specialInstructions}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-white">
                      {formatMXN(calcCartItemPrice(item.price_base, item.comboUpgrade?.price_base) * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.uid)}
                      className="text-muted-foreground transition-colors hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer info */}
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
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
              <CreditCard className="h-4 w-4 text-brand-500" />
              Método de pago
            </h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid gap-2"
            >
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
                  paymentMethod === 'apple_pay' ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:border-brand-500/40'
                )}
              >
                <RadioGroupItem value="apple_pay" />
                <span className="flex-1 text-sm font-medium text-white">Apple Pay</span>
                <span className="text-xs text-muted-foreground">Pago instantáneo</span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
                  paymentMethod === 'google_pay' ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:border-brand-500/40'
                )}
              >
                <RadioGroupItem value="google_pay" />
                <span className="flex-1 text-sm font-medium text-white">Google Pay</span>
                <span className="text-xs text-muted-foreground">Pago instantáneo</span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
                  paymentMethod === 'card' ? 'border-brand-500 bg-brand-500/10' : 'border-border hover:border-brand-500/40'
                )}
              >
                <RadioGroupItem value="card" />
                <span className="flex-1 text-sm font-medium text-white">Tarjeta de crédito/débito</span>
              </label>
            </RadioGroup>

            {paymentMethod === 'card' && (
              <div className="mt-4 grid gap-3">
                <div>
                  <Label className="mb-1.5">Número de tarjeta</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className={cn(errors.cardNumber && 'border-red-500')}
                  />
                  {errors.cardNumber && <p className="mt-1 text-xs text-red-400">{errors.cardNumber}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5">Vencimiento</Label>
                    <Input
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className={cn(errors.cardExpiry && 'border-red-500')}
                    />
                    {errors.cardExpiry && <p className="mt-1 text-xs text-red-400">{errors.cardExpiry}</p>}
                  </div>
                  <div>
                    <Label className="mb-1.5">CVC</Label>
                    <Input
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className={cn(errors.cardCvc && 'border-red-500')}
                    />
                    {errors.cardCvc && <p className="mt-1 text-xs text-red-400">{errors.cardCvc}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-white">Resumen del pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="text-white">{formatMXN(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Cargo por servicio ({(SERVICE_FEE_RATE * 100).toFixed(0)}%)</span>
                <span className="text-white">{formatMXN(serviceFee)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span className="text-white">{formatMXN(deliveryFee)}</span>
              </div>
              <Separator className="my-3 bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-500">{formatMXN(total)}</span>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={processing}
              className="mt-4 w-full bg-brand-500 text-white hover:bg-brand-600"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar y Pagar
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Pago simulado · No se realizará ningún cargo real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
