'use client';

import { useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStripeJs } from '@/lib/stripe-js';
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

type PendingCheckout = {
  customer: OrderCustomer;
  items: CartItem[];
  paymentIntentId: string;
};

function PaymentForm({
  pending,
  onPaid,
}: {
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!stripe || !elements) return;
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
          },
        },
      },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message || 'No se pudo completar el pago');
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status !== 'succeeded') {
      setError('El pago no se completó. Intenta de nuevo.');
      setSubmitting(false);
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
      setError(payload.error || 'Pago hecho, pero no se guardó el pedido');
      setSubmitting(false);
      return;
    }

    onPaid(payload.order as Order);
  };

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        onClick={handlePay}
        disabled={!stripe || submitting}
        className="w-full bg-brand-500 text-white hover:bg-brand-600"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando pago...
          </>
        ) : (
          'Pagar ahora'
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Pago seguro con Stripe · Test mode · Apple Pay y Google Pay si el dispositivo lo permite
      </p>
    </div>
  );
}

export function CheckoutPayment({
  clientSecret,
  pending,
  onPaid,
}: {
  clientSecret: string;
  pending: PendingCheckout;
  onPaid: (order: Order) => void;
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
      <PaymentForm pending={pending} onPaid={onPaid} />
    </Elements>
  );
}
