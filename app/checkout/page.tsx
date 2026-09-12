'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowLeft, CreditCard, Loader2, User, Mail, Clock, Ticket } from 'lucide-react';
import { CheckoutPayment } from '@/components/checkout-payment';
import { DeliveryMap } from '@/components/delivery-map';
import { MenuProductImage } from '@/components/menu-product-image';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { countDeliveryPlatillos } from '@/lib/delivery-tarifa';
import {
  calcCartBaseTotal,
  calcCartLineWeb,
  formatMXN,
} from '@/lib/pricing';
import { calcCheckoutSplit } from '@/lib/checkout-split';
import {
  formatDeliveryAddress,
  formatDeliveryReferences,
  isValidCoord,
  isValidPostalCode,
} from '@/lib/delivery-address';
import { useFulfillment } from '@/lib/fulfillment-context';
import {
  clearCheckoutDraft,
  readCheckoutDraft,
  writeCheckoutDraft,
} from '@/lib/checkout-draft';
import {
  clearGiftRedeem,
  GIFT_COUPON_TITLE,
  GIFT_FULFILLMENT_COPY,
  readGiftRedeem,
} from '@/lib/gift-checkout';
import { lineWebAfterGift, resolveGiftCart } from '@/lib/gift-cart';
import { generatePickupSlots, PICKUP_LEAD_MINUTES } from '@/lib/pickup-slots';
import { FINAL_SALE_CONSENT } from '@/lib/final-sale';
import { getOpenStatus, RESTAURANT_INFO } from '@/lib/restaurant';
import type { Order } from '@/types';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const PENDING_KEY = 'lv_pending_checkout';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, clearCart, setLastOrder } = useCart();
  const { ready, mode, setMode } = useFulfillment();
  const isPickup = mode === 'pickup';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [extNumber, setExtNumber] = useState('');
  const [intNumber, setIntNumber] = useState('');
  const [colonia, setColonia] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [references, setReferences] = useState('');
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);
  const [pickupAt, setPickupAt] = useState('');
  const [pickupSlots, setPickupSlots] = useState<{ iso: string; label: string }[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [payError, setPayError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [quotedFee, setQuotedFee] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [acceptFinalSale, setAcceptFinalSale] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [loyaltyNote, setLoyaltyNote] = useState('');
  const [paySplit, setPaySplit] = useState<{
    subtotalWeb: number;
    deliveryFee: number;
    totalCharged: number;
  } | null>(null);
  const [giftMode, setGiftMode] = useState(() => readGiftRedeem() === 'jumbo');

  const priceBaseTotal = calcCartBaseTotal(items);
  const platilloCount = countDeliveryPlatillos(items);
  const gift = resolveGiftCart({ flagged: giftMode, items, fulfillment: mode });
  const isGiftCheckout = gift.active;
  const isFreeGift = gift.variant === 'free_pickup';
  const giftLineUid = gift.giftLineUid;
  const split = calcCheckoutSplit({
    priceBaseTotal,
    fulfillment: mode ?? 'delivery',
    platilloCount,
    uberFee: isPickup ? 0 : quotedFee ?? 0,
    giftFoodCredit: gift.creditBase,
  });
  const displaySplit = paySplit ?? split;

  useEffect(() => {
    const update = () => {
      setIsOpen(getOpenStatus().isOpen);
      setPickupSlots(generatePickupSlots());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const draft = readCheckoutDraft();
    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setPhone(draft.phone);
      setEmail(draft.email);
      setStreet(draft.street);
      setExtNumber(draft.extNumber);
      setIntNumber(draft.intNumber);
      setColonia(draft.colonia);
      setPostalCode(draft.postalCode);
      setReferences(draft.references);
      setDropoffLat(draft.lat);
      setDropoffLng(draft.lng);
      setPickupAt(draft.pickupAt);
    }
    setGiftMode(readGiftRedeem() === 'jumbo');
    setDraftReady(true);
  }, []);

  useEffect(() => {
    void fetch('/api/customer/me')
      .then((response) => response.json())
      .then((payload) => {
        const profile = payload.customer;
        if (!profile) return;
        setFirstName((value) => value || profile.firstName || '');
        setLastName((value) => value || profile.lastName || '');
        setPhone((value) => value || profile.phone || '');
        setEmail((value) => value || profile.email || '');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const timer = window.setTimeout(() => {
      writeCheckoutDraft({
        firstName,
        lastName,
        phone,
        email,
        street,
        extNumber,
        intNumber,
        colonia,
        postalCode,
        references,
        lat: dropoffLat,
        lng: dropoffLng,
        pickupAt,
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    draftReady,
    firstName,
    lastName,
    phone,
    email,
    street,
    extNumber,
    intNumber,
    colonia,
    postalCode,
    references,
    dropoffLat,
    dropoffLng,
    pickupAt,
  ]);

  useEffect(() => {
    if (!phone.trim() || !email.trim()) {
      setLoyaltyNote('');
      return;
    }
    if (gift.active) {
      setLoyaltyNote('Papas Jumbo cubiertas por el cupón. El resto a precio de carta.');
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch('/api/loyalty/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email,
          fulfillment: mode,
          address: street,
        }),
      })
        .then((response) => response.json())
        .then((payload) => setLoyaltyNote(payload.label || ''))
        .catch(() => setLoyaltyNote(''));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [phone, email, mode, street, gift.active]);

  useEffect(() => {
    if (giftMode && !gift.active) {
      clearGiftRedeem();
      setGiftMode(false);
    }
  }, [giftMode, gift.active]);

  useEffect(() => {
    if (!isGiftCheckout || !isPickup || pickupAt || pickupSlots.length === 0) return;
    setPickupAt(pickupSlots[0].iso);
  }, [isGiftCheckout, isPickup, pickupAt, pickupSlots]);

  useEffect(() => {
    if (!ready) return;
    if (!isOpen) {
      router.replace('/menu');
      return;
    }
    if (!mode) {
      if (giftMode) {
        setMode('pickup');
        return;
      }
      router.replace('/');
    }
  }, [ready, isOpen, mode, giftMode, router, setMode]);

  useEffect(() => {
    setClientSecret('');
    setPaymentIntentId('');
    setPayError('');
    sessionStorage.removeItem(PENDING_KEY);
  }, [mode]);

  useEffect(() => {
    if (isPickup) {
      setQuotedFee(0);
      setQuoteError('');
      setQuoting(false);
      return;
    }
    if (
      dropoffLat == null ||
      dropoffLng == null ||
      !isValidCoord(dropoffLat, dropoffLng) ||
      !street.trim() ||
      !extNumber.trim() ||
      !isValidPostalCode(postalCode)
    ) {
      setQuotedFee(null);
      setQuoteError('');
      return;
    }

    const timer = window.setTimeout(() => {
      setQuoting(true);
      setQuoteError('');
      fetch('/api/delivery-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: dropoffLat,
          lng: dropoffLng,
          street,
          extNumber,
          postalCode,
          phone,
        }),
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || 'No se pudo cotizar el envío');
          setQuotedFee(payload.fee);
        })
        .catch((error: Error) => {
          setQuotedFee(null);
          setQuoteError(error.message);
        })
        .finally(() => setQuoting(false));
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isPickup, dropoffLat, dropoffLng, street, extNumber, postalCode, phone]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'El nombre es obligatorio';
    if (!lastName.trim()) e.lastName = 'El apellido es obligatorio';
    if (!phone.trim()) e.phone = 'El teléfono es obligatorio';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Teléfono inválido (mín. 10 dígitos)';
    if (!email.trim()) e.email = 'El correo es obligatorio para tu ticket';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Correo inválido';
    if (isPickup) {
      if (!pickupAt) e.pickupAt = `Elige una hora (mínimo ${PICKUP_LEAD_MINUTES} min)`;
    } else {
      if (!street.trim()) e.street = 'La calle es obligatoria';
      if (!extNumber.trim()) e.extNumber = 'El número exterior es obligatorio';
      if (!colonia.trim()) e.colonia = 'La colonia es obligatoria';
      if (!isValidPostalCode(postalCode)) e.postalCode = 'Código postal de 5 dígitos';
      if (
        dropoffLat == null ||
        dropoffLng == null ||
        !isValidCoord(dropoffLat, dropoffLng)
      ) {
        e.map = 'Marca el punto exacto en el mapa';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const startPayment = async () => {
    if (items.length === 0 || !mode) return;
    if (!validate()) return;
    if (!acceptFinalSale) {
      setErrors((prev) => ({
        ...prev,
        acceptFinalSale: 'Confirma que el pedido es venta final para continuar',
      }));
      return;
    }
    if (!isFreeGift && !isPickup && (quotedFee == null || quoting)) return;
    if (gift.active) {
      const session = await fetch('/api/customer/me').then((response) => response.json()).catch(() => null);
      if (!session?.customer) {
        setPayError('Entra a tu perfil para usar el cupón');
        return;
      }
    }
    setCreatingIntent(true);
    setPayError('');

    const address = isPickup
      ? RESTAURANT_INFO.address
      : formatDeliveryAddress({ street, extNumber, intNumber, colonia, postalCode });
    const customer = {
      name: `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' '),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      email,
      address,
      references: isPickup ? '' : references,
      lat: isPickup ? undefined : dropoffLat,
      lng: isPickup ? undefined : dropoffLng,
    };
    if (isFreeGift) {
      const giftResponse = await fetch('/api/loyalty/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment: mode,
          pickupAt,
          items,
        }),
      });
      const giftPayload = await giftResponse.json();
      setCreatingIntent(false);
      if (!giftResponse.ok) {
        setPayError(giftPayload.error || 'No se pudo canjear');
        return;
      }
      handlePaid(giftPayload.order as Order);
      return;
    }

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceBaseTotal,
        fulfillment: mode,
        pickupAt: isPickup ? pickupAt : null,
        stripeAccountId: process.env.NEXT_PUBLIC_STRIPE_CONNECT_ACCOUNT_ID,
        customer,
        items,
        acceptFinalSale: true,
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
    if (payload.split) {
      setPaySplit({
        subtotalWeb: Number(payload.split.subtotalWeb),
        deliveryFee: Number(payload.split.deliveryFee),
        totalCharged: Number(payload.split.totalCharged),
      });
    }
    if (payload.loyalty?.label) setLoyaltyNote(payload.loyalty.label);
  };

  const handlePaid = (order: Order) => {
    sessionStorage.removeItem(PENDING_KEY);
    clearCheckoutDraft();
    clearGiftRedeem();
    setLastOrder(order);
    clearCart();
    router.push(`/orders/${order.id}`);
  };

  if (items.length === 0 && !clientSecret) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold text-white">Tu carrito está vacío</p>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos para continuar.</p>
        <Button onClick={() => router.push('/menu')} className="mt-6 bg-brand-500 text-white hover:bg-brand-600">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al menú
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
      <button
        onClick={() => router.push('/menu')}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Seguir pidiendo
      </button>
      {isGiftCheckout ? (
        <p className="mb-4 -mt-2 text-xs text-muted-foreground">
          Puedes agregar más platillos. El cupón sigue cubriendo las Papas Jumbo; lo demás se cobra aparte.
        </p>
      ) : null}

      <h1 className="mb-6 text-xl font-bold text-white sm:text-2xl">
        {isGiftCheckout ? GIFT_COUPON_TITLE : 'Checkout'}
      </h1>
      {isGiftCheckout ? (
        <div className="mb-6 -mt-2 space-y-3">
          <p className="text-sm text-muted-foreground">{GIFT_FULFILLMENT_COPY}</p>
          {!clientSecret ? (
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('pickup')}
                className={cn(
                  'min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold leading-tight',
                  isPickup
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                Recoger · sin costo
              </button>
              <button
                type="button"
                onClick={() => setMode('delivery')}
                className={cn(
                  'min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold leading-tight',
                  !isPickup
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-border bg-card text-muted-foreground'
                )}
              >
                Domicilio · solo envío
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-white">Tu pedido ({items.length} items)</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.uid} className="flex items-start gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <MenuProductImage src={item.image} alt={item.name} sizes="56px" />
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
                    {item.extras?.map((extra) => (
                      <p key={extra.id} className="text-xs text-brand-400">
                        + {extra.name}
                      </p>
                    ))}
                    {item.removals && item.removals.length > 0 && (
                      <p className="text-xs text-muted-foreground">Sin {item.removals.join(', ').toLowerCase()}</p>
                    )}
                    {item.comboUpgrade && (
                      <p className="text-xs text-brand-400">{item.comboUpgrade.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-right text-sm font-semibold text-white">
                      {item.uid === giftLineUid ? (
                        <>
                          <span className="block text-xs font-medium text-brand-400">Cupón</span>
                          {item.quantity > 1 ? (
                            <>
                              <span className="mr-1 text-xs font-normal text-muted-foreground line-through">
                                {formatMXN(calcCartLineWeb(item))}
                              </span>
                              {formatMXN(lineWebAfterGift(item, giftLineUid))}
                            </>
                          ) : (
                            formatMXN(0)
                          )}
                        </>
                      ) : (
                        formatMXN(calcCartLineWeb(item))
                      )}
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
              {isPickup ? 'Información de recoger' : 'Información de entrega'}
            </h2>
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5">Nombre</Label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Nombre"
                    disabled={Boolean(clientSecret) || gift.active}
                    className={cn(errors.firstName && 'border-red-500')}
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <Label className="mb-1.5">Apellido</Label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Apellido"
                    disabled={Boolean(clientSecret) || gift.active}
                    className={cn(errors.lastName && 'border-red-500')}
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <Label className="mb-1.5">Teléfono</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 614 ..."
                  disabled={Boolean(clientSecret) || gift.active}
                  className={cn(errors.phone && 'border-red-500')}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
              </div>
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-brand-500" />
                  Correo
                </Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@email.com"
                  disabled={Boolean(clientSecret) || gift.active}
                  className={cn(errors.email && 'border-red-500')}
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Usamos tu correo para enviarte el ticket digital de este pedido.
                </p>
              </div>
              {isPickup ? (
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand-500" />
                    Hora para recoger
                  </Label>
                  <select
                    value={pickupAt}
                    onChange={(e) => setPickupAt(e.target.value)}
                    disabled={Boolean(clientSecret)}
                    className={cn(
                      'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                      errors.pickupAt && 'border-red-500'
                    )}
                  >
                    <option value="">Elige hora (desde {PICKUP_LEAD_MINUTES} min)</option>
                    {pickupSlots.map((slot) => (
                      <option key={slot.iso} value={slot.iso}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {errors.pickupAt && <p className="mt-1 text-xs text-red-400">{errors.pickupAt}</p>}
                  {pickupSlots.length === 0 && (
                    <p className="mt-1.5 text-xs text-red-400">
                      Ya no hay horarios de recoger en esta jornada.
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Recoges en {RESTAURANT_INFO.address}.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="mb-1.5">Calle</Label>
                    <Input
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Calle"
                      disabled={Boolean(clientSecret)}
                      className={cn(errors.street && 'border-red-500')}
                    />
                    {errors.street && <p className="mt-1 text-xs text-red-400">{errors.street}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5">Número exterior</Label>
                      <Input
                        value={extNumber}
                        onChange={(e) => setExtNumber(e.target.value)}
                        placeholder="Número"
                        disabled={Boolean(clientSecret)}
                        className={cn(errors.extNumber && 'border-red-500')}
                      />
                      {errors.extNumber && <p className="mt-1 text-xs text-red-400">{errors.extNumber}</p>}
                    </div>
                    <div>
                      <Label className="mb-1.5">Número interior</Label>
                      <Input
                        value={intNumber}
                        onChange={(e) => setIntNumber(e.target.value)}
                        placeholder="Opcional"
                        disabled={Boolean(clientSecret)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="mb-1.5">Colonia</Label>
                    <Input
                      value={colonia}
                      onChange={(e) => setColonia(e.target.value)}
                      placeholder="Colonia"
                      disabled={Boolean(clientSecret)}
                      className={cn(errors.colonia && 'border-red-500')}
                    />
                    {errors.colonia && <p className="mt-1 text-xs text-red-400">{errors.colonia}</p>}
                  </div>
                  <div>
                    <Label className="mb-1.5">Código postal</Label>
                    <Input
                      inputMode="numeric"
                      maxLength={5}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      placeholder="C.P."
                      disabled={Boolean(clientSecret)}
                      className={cn(errors.postalCode && 'border-red-500')}
                    />
                    {errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}
                  </div>
                  <div>
                    <Label className="mb-1.5">Punto exacto de entrega</Label>
                    <DeliveryMap
                      lat={dropoffLat}
                      lng={dropoffLng}
                      disabled={Boolean(clientSecret)}
                      onPick={(nextLat, nextLng) => {
                        setDropoffLat(nextLat);
                        setDropoffLng(nextLng);
                      }}
                    />
                    {errors.map && <p className="mt-1 text-xs text-red-400">{errors.map}</p>}
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
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
              {isGiftCheckout ? (
                <Ticket className="h-4 w-4 text-brand-500" />
              ) : (
                <CreditCard className="h-4 w-4 text-brand-500" />
              )}
              {isGiftCheckout ? GIFT_COUPON_TITLE : 'Pago'}
            </h2>
            {isGiftCheckout ? (
              <div className="mb-4 space-y-2">
                <p className="text-sm leading-relaxed text-muted-foreground">{GIFT_FULFILLMENT_COPY}</p>
                {gift.variant === 'free_pickup' ? (
                  <p className="text-xs text-brand-400">
                    Recoger: una orden de Jumbo cubierta. Total $0.00 MXN.
                  </p>
                ) : gift.variant === 'mixed_pickup' ? (
                  <p className="text-xs text-brand-400">
                    Recoger: el Jumbo va en el cupón. Pagas {formatMXN(displaySplit.subtotalWeb)} por el resto.
                  </p>
                ) : quoting ? (
                  <p className="flex items-center gap-1.5 text-xs text-brand-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cotizando envío con Uber Direct…
                  </p>
                ) : quotedFee != null ? (
                  <p className="text-xs text-brand-400">
                    Envío cotizado: {formatMXN(displaySplit.deliveryFee)}. El Jumbo del cupón no se cobra
                    {displaySplit.subtotalWeb > 0
                      ? `; los demás artículos suman ${formatMXN(displaySplit.subtotalWeb)}.`
                      : '.'}
                  </p>
                ) : quoteError ? (
                  <p className="text-xs text-red-400">{quoteError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Completa dirección, C.P. y el punto en el mapa para cotizar el envío.
                  </p>
                )}
              </div>
            ) : null}
            {clientSecret ? (
              <CheckoutPayment
                clientSecret={clientSecret}
                pending={{
                  customer: {
                    name: `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' '),
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone,
                    email,
                    address: isPickup
                      ? RESTAURANT_INFO.address
                      : formatDeliveryAddress({ street, extNumber, intNumber, colonia, postalCode }),
                    references: isPickup
                      ? ''
                      : formatDeliveryReferences(references, dropoffLat, dropoffLng),
                  },
                  items,
                  paymentIntentId,
                }}
                onPaid={handlePaid}
                submitLabel={
                  gift.variant === 'shipping_only' || gift.variant === 'mixed_delivery'
                    ? 'Canjear · pagar envío'
                    : gift.variant === 'mixed_pickup'
                      ? 'Canjear · pagar'
                      : 'Pagar ahora'
                }
              />
            ) : (
              <div>
                {payError && <p className="mb-3 text-sm text-red-400">{payError}</p>}
                <label className="mb-4 flex items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox
                    checked={acceptFinalSale}
                    onCheckedChange={(value) => {
                      setAcceptFinalSale(value === true);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.acceptFinalSale;
                        return next;
                      });
                    }}
                    className="mt-0.5 border-border"
                    disabled={Boolean(clientSecret)}
                  />
                  <span>
                    {isGiftCheckout
                      ? 'Confirmo las condiciones de este cupón. No admite cancelación ni devolución.'
                      : FINAL_SALE_CONSENT}{' '}
                    <a href="/terminos" className="text-brand-400 underline-offset-2 hover:underline">
                      Términos
                    </a>
                    .
                  </span>
                </label>
                {errors.acceptFinalSale && (
                  <p className="mb-3 text-xs text-red-400">{errors.acceptFinalSale}</p>
                )}
                <Button
                  onClick={startPayment}
                  disabled={
                    creatingIntent ||
                    !acceptFinalSale ||
                    (isPickup && pickupSlots.length === 0) ||
                    (!isFreeGift && !isPickup && (quoting || quotedFee == null))
                  }
                  className="w-full bg-brand-500 text-white hover:bg-brand-600"
                  size="lg"
                >
                  {creatingIntent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isGiftCheckout ? 'Canjeando...' : 'Preparando pago...'}
                    </>
                  ) : gift.variant === 'free_pickup' ? (
                    'Canjear'
                  ) : gift.variant === 'mixed_pickup' ? (
                    'Canjear · pagar'
                  ) : gift.active ? (
                    'Canjear · pagar envío'
                  ) : (
                    'Pagar'
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
                <span>Comida</span>
                <span className="text-white">{formatMXN(displaySplit.subtotalWeb)}</span>
              </div>
              {loyaltyNote ? <p className="text-xs text-brand-400">{loyaltyNote}</p> : null}
              {isPickup ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span className="text-white">{formatMXN(0)}</span>
                </div>
              ) : quoting ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span className="text-white">Calculando...</span>
                </div>
              ) : quotedFee != null ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span className="text-white">{formatMXN(displaySplit.deliveryFee)}</span>
                </div>
              ) : (
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span className="text-white">—</span>
                </div>
              )}
              {quoteError && <p className="text-xs text-red-400">{quoteError}</p>}
              <Separator className="my-3 bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-brand-500">{formatMXN(isFreeGift ? 0 : displaySplit.totalCharged)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
