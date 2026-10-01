'use client';

import { useEffect } from 'react';

/** Entra con el enlace del pedido y quita el acceso de la barra, salvo en /instalar. */
export function CustomerEntrySession() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('pedido') || '';
    const token = params.get('s') || '';
    if (!orderId || token.length < 16) return;

    let cancelled = false;
    void fetch('/api/customer/from-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, token }),
    }).then((response) => {
      if (!response.ok || cancelled) return;
      window.dispatchEvent(new Event('lv-customer-session'));
      if (window.location.pathname === '/instalar') return;
      params.delete('pedido');
      params.delete('s');
      const next = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (next ? `?${next}` : '') + window.location.hash);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
