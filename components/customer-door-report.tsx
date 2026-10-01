'use client';

import { useMemo, useState } from 'react';
import type { Order } from '@/types';

async function asDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se leyó la foto'));
    reader.readAsDataURL(file);
  });
}

export function CustomerDoorReport({ orders }: { orders: Order[] }) {
  const doorOrders = useMemo(() => orders.filter((order) => order.leaveAtDoor), [orders]);
  const [orderId, setOrderId] = useState(doorOrders[0]?.id || '');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (doorOrders.length === 0) return null;

  async function submit() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/customer/door-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, note, photo }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(payload.message || payload.error || 'No se envió');
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card p-3">
      <h3 className="text-sm font-bold text-white">No dejaron el pedido en la puerta</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Solo si pediste dejarlo en la puerta. Adjunta una foto de la puerta o del lugar vacío y describe qué pasó. Si se aprueba, se reembolsa lo que pagaste.
      </p>
      <label className="mt-3 block text-xs text-muted-foreground">
        Pedido
        <select
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
        >
          {doorOrders.map((order) => (
            <option key={order.id} value={order.id}>
              #{order.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <textarea
        className="mt-3 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white"
        rows={3}
        placeholder="Qué viste al llegar"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <label className="mt-3 block text-xs text-muted-foreground">
        Foto de la puerta o del lugar vacío
        <input
          className="mt-1 block w-full text-white"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void asDataUrl(file).then(setPhoto);
          }}
        />
      </label>
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white"
        disabled={busy}
        onClick={() => void submit()}
      >
        Enviar reporte
      </button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}
