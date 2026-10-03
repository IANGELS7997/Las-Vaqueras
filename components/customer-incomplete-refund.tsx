'use client';

import { useEffect, useState } from 'react';
import { isRefundReview, REFUND_ACCEPTED_LABEL } from '@/lib/rider-help';
import type { Order } from '@/types';

const REASONS = ['Faltó un producto', 'Llegó equivocado', 'Llegó en mal estado', 'Faltó un extra', 'Otro'];

async function asDataUrl(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se leyó la foto'));
    reader.readAsDataURL(file);
  });
  return data;
}

function eligible(order: Order) {
  if (order.status === 'cancelled' || order.status === 'awaiting_payment') return false;
  if (isRefundReview(order.helpLabel) || order.helpLabel === REFUND_ACCEPTED_LABEL) return false;
  return true;
}

export function CustomerIncompleteRefund({ orders, onSent }: { orders: Order[]; onSent?: () => void }) {
  const open = orders.filter((order) => eligible(order));
  const [orderId, setOrderId] = useState(open[0]?.id || '');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [ticket, setTicket] = useState('');
  const [food, setFood] = useState('');
  const [message, setMessage] = useState('');
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/customer/refund-request')
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const row of payload.requests || []) next[String(row.orderId)] = String(row.message || '');
        setStatuses(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [message]);

  const notices = Object.entries(statuses).filter(([, text]) => text);
  if (open.length === 0 && notices.length === 0) return null;
  const selected = open.find((order) => order.id === orderId) || open[0];
  const existing = selected ? statuses[selected.id] : '';
  const locked = Boolean(existing) && !existing.startsWith('Rechazado');

  async function submit() {
    if (!selected) return;
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/customer/refund-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: selected.id, reason, note, ticketPhoto: ticket, foodPhoto: food }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(payload.message || payload.error || 'No se envió');
    if (response.ok) onSent?.();
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card p-3">
      <h3 className="text-sm font-bold text-white">Solicitar reembolso</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Adjunta la foto de la comida y la foto del ticket, y describe qué pasó. Si el pago fue con tarjeta y se acepta, el total vuelve a tu tarjeta. Si fue en efectivo y se acepta, comida y envío quedan en tu próxima compra.
      </p>
      {notices.map(([id, text]) => (
        <p key={id} className="mt-2 text-xs text-orange-300">
          #{orders.find((order) => order.id === id)?.shortCode || id.slice(0, 8)}: {text}
        </p>
      ))}
      {open.length === 0 || !selected ? null : (
      <>
      <label className="mt-3 block text-xs text-muted-foreground">
        Pedido
        <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white" value={selected.id} onChange={(event) => setOrderId(event.target.value)}>
          {open.map((order) => (
            <option key={order.id} value={order.id}>
              #{order.shortCode || order.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs text-muted-foreground">
        Qué falló
        <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white" value={reason} onChange={(event) => setReason(event.target.value)}>
          {REASONS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <textarea
        className="mt-3 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white"
        rows={3}
        placeholder="Describe qué pasó"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
        <label>
          Foto de la comida
          <input className="mt-1 block w-full text-white" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void asDataUrl(file).then(setFood);
          }} />
        </label>
        <label>
          Foto del ticket
          <input className="mt-1 block w-full text-white" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void asDataUrl(file).then(setTicket);
          }} />
        </label>
      </div>
      <button type="button" className="mt-3 w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white" disabled={busy || locked} onClick={() => void submit()}>
        Solicitar reembolso
      </button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      </>
      )}
    </section>
  );
}
