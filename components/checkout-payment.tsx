'use client';

import { useState } from 'react';
import { Elements, ExpressCheckoutElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type {
  StripeExpressCheckoutElementConfirmEvent,
  StripeExpressCheckoutElementReadyEvent,
} from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { getStripeJs } from '@/lib/stripe-js';
import { reportPaymentFailed } from '@/lib/dev-signal-client';
import type { CartItem, Order, OrderCustomer } from '@/types';

const appearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#f97316',
    colorBackground: '#171717',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    borderRadius: '10px',
  },
};

const walletOptions = {
  buttonHeight: 48,
  buttonTheme: { applePay: 'white' as const, googlePay: 'white' as const },
  buttonType: { applePay: 'buy' as const, googlePay: 'pay' as const },
  layout: { maxColumns: 1, maxRows: 2, overflow: 'never' as const },
  billingAddressRequired: false,
  emailRequired: false,
  phoneNumberRequired: false,
  shippingAddressRequired: false,
  paymentMethodOrder: ['apple_pay', 'google_pay'],
  paymentMethods: {
    applePay: 'always' as const,
    googlePay: 'always' as const,
    link: 'never' as const,
    paypal: 'never' as const,
    amazonPay: 'never' as const,
    klarna: 'never' as const,
  },
};

type PendingCheckout = {
  customer: OrderCustomer;
  items: CartItem[];
  paymentIntentId: string;
};

type WalletState = 'loading' | 'ready' | 'unavailable';

function hasWallet(event: StripeExpressCheckoutElementReadyEvent) {
  const methods = event.availablePaymentMethods;
  return Boolean(methods?.applePay || methods?.googlePay);
}

function PaymentForm({
  pending,
  onPaid,
  submitLabel,
  cashAvailable,
}: {
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
  submitLabel: string;
  cashAvailable: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wallets, setWallets] = useState<WalletState>('loading');

  const fail = (message: string) => {
    setError(message);
    reportPaymentFailed(message, pending.items);
    setSubmitting(false);
  };

  const onConfirm = async (event: StripeExpressCheckoutElementConfirmEvent) => {
    if (event.expressPaymentType !== 'apple_pay' && event.expressPaymentType !== 'google_pay') {
      event.paymentFailed({ reason: 'fail', message: 'Solo Apple Pay y Google Pay.' });
      return;
    }
    if (!stripe || !elements) {
      event.paymentFailed({ reason: 'fail', message: 'El pago todavía no está listo.' });
      return;
    }

    setSubmitting(true);
    setError('');

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/complete`,
        payment_method_data: {
          billing_details: {
            name: pending.customer.name,
            phone: pending.customer.phone,
            email: pending.customer.email.trim(),
          },
        },
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      const message = confirmError.message || 'No se pudo completar el pago';
      event.paymentFailed({ reason: 'fail', message });
      fail(message);
      return;
    }

    if (paymentIntent?.status !== 'succeeded') {
      const message = 'El pago no se completó. Intenta de nuevo.';
      event.paymentFailed({ reason: 'fail', message });
      fail(message);
      return;
    }

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: pending.paymentIntentId,
        customer: pending.customer,
        items: pending.items,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      fail(payload.error || 'Pago hecho, pero no se guardó el pedido');
      return;
    }

    onPaid(payload.order as Order);
  };

  const unavailable = cashAvailable
    ? 'Este dispositivo no tiene Apple Pay ni Google Pay. Puedes pagar en efectivo.'
    : 'Este dispositivo no tiene Apple Pay ni Google Pay. Aquí el pago en línea solo se hace con una de esas dos.';

  return (
    <div className="space-y-4">
      {submitLabel !== 'Pagar ahora' ? (
        <p className="text-sm font-semibold text-white">{submitLabel}</p>
      ) : null}
      <ExpressCheckoutElement
        options={walletOptions}
        onReady={(event) => setWallets(hasWallet(event) ? 'ready' : 'unavailable')}
        onAvailablePaymentMethodsChange={(event) => {
          const methods = event.paymentMethods;
          if (!methods) return;
          const ready = Boolean(methods.applePay?.available || methods.googlePay?.available);
          setWallets(ready ? 'ready' : 'unavailable');
        }}
        onLoadError={(event) => {
          setError(event.error.message || 'No se pudieron cargar Apple Pay ni Google Pay');
          setWallets('unavailable');
        }}
        onCancel={() => setSubmitting(false)}
        onConfirm={onConfirm}
      />
      {wallets === 'loading' ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando Apple Pay y Google Pay...
        </p>
      ) : null}
      {wallets === 'unavailable' ? (
        <p className="rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
          {unavailable}
        </p>
      ) : null}
      {submitting ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Procesando pago...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <p className="text-center text-xs text-muted-foreground">
        Apple Pay o Google Pay. El número de tarjeta no se escribe aquí.
      </p>
    </div>
  );
}

export function CheckoutPayment({
  clientSecret,
  pending,
  onPaid,
  submitLabel = 'Pagar ahora',
  cashAvailable = false,
}: {
  clientSecret: string;
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
  submitLabel?: string;
  cashAvailable?: boolean;
}) {
  return (
    <Elements
      stripe={getStripeJs()}
      options={{
        clientSecret,
        appearance,
        locale: 'es',
      }}
    >
      <PaymentForm
        pending={pending}
        onPaid={onPaid}
        submitLabel={submitLabel}
        cashAvailable={cashAvailable}
      />
    </Elements>
  );
}
