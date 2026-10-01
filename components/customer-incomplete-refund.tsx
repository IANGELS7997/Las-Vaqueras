'use client';

import { useState } from 'react';
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

export function CustomerIncompleteRefund({ orders }: { orders: Order[] }) {
  const [orderId, setOrderId] = useState(orders[0]?.id || '');
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [choice, setChoice] = useState<'bank' | 'discount' | ''>('');
  const [ticket, setTicket] = useState('');
  const [food, setFood] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (orders.length === 0) return null;

  async function submit() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/customer/refund-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason, note, choice, ticketPhoto: ticket, foodPhoto: food }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(payload.message || payload.error || 'No se envió');
  }

  return (
    <section className="rounded-xl border border-border/60 bg-card p-3">
      <h3 className="text-sm font-bold text-white">Pedido incorrecto o incompleto</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Solo este caso se pide desde tu perfil. Hace falta el reporte del repartidor, la foto del ticket, la foto de la comida y qué pasó. No se reembolsa solo: primero se aprueba.
      </p>
      <label className="mt-3 block text-xs text-muted-foreground">
        Pedido
        <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-white" value={orderId} onChange={(event) => setOrderId(event.target.value)}>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              #{order.id.slice(0, 8)}
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
          Foto del ticket
          <input className="mt-1 block w-full text-white" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void asDataUrl(file).then(setTicket);
          }} />
        </label>
        <label>
          Foto de la comida
          <input className="mt-1 block w-full text-white" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void asDataUrl(file).then(setFood);
          }} />
        </label>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={`rounded-md border px-2 py-2 text-xs ${choice === 'bank' ? 'border-orange-400 text-white' : 'border-border text-muted-foreground'}`} onClick={() => setChoice('bank')}>
          Reembolso a mi cuenta
        </button>
        <button type="button" className={`rounded-md border px-2 py-2 text-xs ${choice === 'discount' ? 'border-orange-400 text-white' : 'border-border text-muted-foreground'}`} onClick={() => setChoice('discount')}>
          Descuento en la próxima
        </button>
      </div>
      <button type="button" className="mt-3 w-full rounded-md bg-orange-500 px-3 py-2 text-sm font-semibold text-white" disabled={busy} onClick={() => void submit()}>
        Enviar solicitud
      </button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </section>
  );
}
