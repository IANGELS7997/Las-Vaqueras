'use client';

import { useEffect, useRef, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type {
  StripeExpressCheckoutElement,
  StripeExpressCheckoutElementConfirmEvent,
} from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

const WALLET_LOAD_MS = 10000;

const walletOptions = {
  buttonHeight: 48,
  buttonTheme: { applePay: 'white' as const, googlePay: 'white' as const },
  buttonType: { applePay: 'buy' as const, googlePay: 'pay' as const },
  billingAddressRequired: false,
  emailRequired: false,
  phoneNumberRequired: false,
  shippingAddressRequired: false,
  paymentMethods: {
    applePay: 'always' as const,
    googlePay: 'always' as const,
    link: 'never' as const,
    paypal: 'never' as const,
    amazonPay: 'never' as const,
    klarna: 'never' as const,
  },
};

const cardOptions = {
  layout: 'tabs' as const,
  wallets: {
    applePay: 'never' as const,
    googlePay: 'never' as const,
    link: 'never' as const,
  },
  fields: {
    billingDetails: {
      name: 'never' as const,
      email: 'never' as const,
      phone: 'never' as const,
      address: 'if_required' as const,
    },
  },
};

type PendingCheckout = {
  customer: OrderCustomer;
  items: CartItem[];
  paymentIntentId: string;
};

type WalletState = 'loading' | 'ready' | 'unavailable';

type WalletFlag = boolean | { available?: boolean } | undefined;

function walletOn(value: WalletFlag) {
  if (typeof value === 'boolean') return value;
  return Boolean(value?.available);
}

function walletsReady(methods?: { applePay?: WalletFlag; googlePay?: WalletFlag } | null) {
  if (!methods) return false;
  return walletOn(methods.applePay) || walletOn(methods.googlePay);
}

function WalletButtons({
  onReady,
  onMethods,
  onLoadError,
  onCancel,
  onConfirm,
}: {
  onReady: (methods: { applePay?: WalletFlag; googlePay?: WalletFlag } | null | undefined) => void;
  onMethods: (methods: { applePay?: WalletFlag; googlePay?: WalletFlag } | null | undefined) => void;
  onLoadError: (message: string) => void;
  onCancel: () => void;
  onConfirm: (event: StripeExpressCheckoutElementConfirmEvent) => void;
}) {
  const elements = useElements();
  const nodeRef = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onReady, onMethods, onLoadError, onCancel, onConfirm });
  handlers.current = { onReady, onMethods, onLoadError, onCancel, onConfirm };

  useEffect(() => {
    if (!elements || !nodeRef.current) return;
    let element: StripeExpressCheckoutElement;
    try {
      element = elements.create('expressCheckout', walletOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron cargar Apple Pay ni Google Pay';
      handlers.current.onLoadError(message);
      return;
    }
    element.on('ready', (event) => handlers.current.onReady(event.availablePaymentMethods));
    element.on('availablepaymentmethodschange', (event) => {
      handlers.current.onMethods(event.paymentMethods);
    });
    element.on('loaderror', (event) => {
      handlers.current.onLoadError(event.error.message || 'No se pudieron cargar Apple Pay ni Google Pay');
    });
    element.on('cancel', () => handlers.current.onCancel());
    element.on('confirm', (event) => handlers.current.onConfirm(event));
    element.mount(nodeRef.current);
    return () => {
      element.unmount();
      element.destroy();
    };
  }, [elements]);

  return <div ref={nodeRef} />;
}

function PaymentForm({
  pending,
  onPaid,
  submitLabel,
}: {
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [wallets, setWallets] = useState<WalletState>('loading');
  const payLabel = submitLabel === 'Pagar ahora' ? 'Pagar' : submitLabel;

  useEffect(() => {
    if (wallets !== 'loading') return;
    const timer = window.setTimeout(() => {
      setWallets((current) => (current === 'loading' ? 'unavailable' : current));
    }, WALLET_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [wallets]);

  const fail = (message: string) => {
    setError(message);
    reportPaymentFailed(message, pending.items);
    setSubmitting(false);
  };

  const confirmAndSave = async (): Promise<string | null> => {
    if (!stripe || !elements) return 'El pago todavía no está listo.';
    try {
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

      if (confirmError) return confirmError.message || 'No se pudo completar el pago';
      if (paymentIntent?.status !== 'succeeded') return 'El pago no se completó. Intenta de nuevo.';

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
      if (!response.ok) return payload.error || 'Pago hecho, pero no se guardó el pedido';
      onPaid(payload.order as Order);
      return null;
    } catch {
      return 'No se pudo completar el pago';
    }
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
    const message = await confirmAndSave();
    if (!message) return;
    event.paymentFailed({ reason: 'fail', message });
    fail(message);
  };

  const payWithCard = async () => {
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError('');
    const { error: submitError } = await elements.submit();
    if (submitError) {
      fail(submitError.message || 'No se pudo completar el pago');
      return;
    }
    const message = await confirmAndSave();
    if (message) fail(message);
  };

  const noteWallets = (methods: { applePay?: WalletFlag; googlePay?: WalletFlag } | null | undefined) => {
    const ready = walletsReady(methods);
    setWallets(ready ? 'ready' : 'unavailable');
    if (wallets === 'loading') setError('');
  };

  return (
    <div className="space-y-4">
      {submitLabel !== 'Pagar ahora' && wallets === 'ready' ? (
        <p className="text-sm font-semibold text-white">{submitLabel}</p>
      ) : null}
      {wallets === 'unavailable' ? null : (
        <WalletButtons
          onReady={noteWallets}
          onMethods={(methods) => {
            if (!methods) return;
            noteWallets(methods);
          }}
          onLoadError={() => setWallets('unavailable')}
          onCancel={() => setSubmitting(false)}
          onConfirm={onConfirm}
        />
      )}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void payWithCard();
        }}
      >
        <PaymentElement
          options={cardOptions}
          onLoadError={(event) => {
            setError(event.error.message || 'No se pudo completar el pago');
          }}
        />
        <Button
          type="submit"
          disabled={submitting || !stripe}
          className="w-full bg-brand-500 text-white hover:bg-brand-600"
          size="lg"
        >
          {payLabel}
        </Button>
      </form>
      {submitting ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Procesando pago...
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export function CheckoutPayment({
  clientSecret,
  pending,
  onPaid,
  submitLabel = 'Pagar ahora',
}: {
  clientSecret: string;
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
  submitLabel?: string;
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
      <PaymentForm pending={pending} onPaid={onPaid} submitLabel={submitLabel} />
    </Elements>
  );
}
