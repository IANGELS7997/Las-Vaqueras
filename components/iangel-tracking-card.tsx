'use client';

import { useEffect, useState } from 'react';
import { IANGEL_THEME } from '@/lib/iangel-theme';
import { etaCopy } from '@/lib/iangel-eta';
import type { Order } from '@/types';
import { TrackingMap } from '@/components/tracking-map';
import { cn } from '@/lib/utils';

type Message = { id: string; actor: string; kind: string; body: string; created_at: string };

export function IangelTrackingCard({
  order,
  token,
}: {
  order: Order;
  token?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [quick, setQuick] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState(false);
  const eta = order.etaMinutes || order.estimatedMinutes;
  useEffect(() => {
    if (document.getElementById('ia-fonts')) return;
    const link = document.createElement('link');
    link.id = 'ia-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Outfit:wght@600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);
  const delivered = order.status === 'delivered' || order.status === 'delivered_unclaimed';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch(`/api/orders/${order.id}/messages?s=${encodeURIComponent(token || '')}`);
      if (!response.ok) return;
      const payload = await response.json();
      if (!cancelled) {
        setMessages(payload.messages || []);
        setQuick(payload.quick || []);
      }
    };
    void load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [order.id, token]);

  const send = async (body: string) => {
    if (!body.trim()) return;
    await fetch(`/api/orders/${order.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: body, token }),
    });
    setText('');
  };

  const enablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) return;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapid,
    });
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audience: 'customer', orderId: order.id, token, subscription: sub.toJSON() }),
    });
  };

  return (
    <section
      className="iangel-surface iangel-pulse mb-4 rounded-[20px] border p-4"
      style={{ borderColor: IANGEL_THEME.line, fontFamily: '"DM Sans", sans-serif' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: IANGEL_THEME.skyDeep }}>
        IANGEL
      </p>
      <p
        className="mt-1 text-5xl font-bold tabular-nums"
        style={{ color: IANGEL_THEME.ink, fontFamily: 'Outfit, sans-serif' }}
      >
        #{order.shortCode || order.id.slice(0, 4).toUpperCase()}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: IANGEL_THEME.skyDeep }}>
        {etaCopy(eta)}
      </p>
      <p className="mt-1 text-sm" style={{ color: IANGEL_THEME.muted }}>
        Tiempo estimado. Se actualiza con la ubicación del rider.
      </p>
      {order.cookHold ? (
        <p className="mt-3 rounded-2xl px-3 py-2 text-sm font-semibold" style={{ background: IANGEL_THEME.skySoft, color: IANGEL_THEME.wait }}>
          Cocina en espera hasta que termine el viaje actual.
        </p>
      ) : null}
      <div className="mt-4">
        <TrackingMap
          dropLat={order.dropoffLat || null}
          dropLng={order.dropoffLng || null}
          riderLat={order.riderLat}
          riderLng={order.riderLng}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${order.customer.phone}`}
          className="flex-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold"
          style={{ borderColor: IANGEL_THEME.skyDeep, color: IANGEL_THEME.skyDeep, background: IANGEL_THEME.white }}
        >
          Llamar
        </a>
        {order.phoneAlt ? (
          <a
            href={`tel:${order.phoneAlt}`}
            className="flex-1 rounded-2xl border px-3 py-3 text-center text-sm font-semibold"
            style={{ borderColor: IANGEL_THEME.skyDeep, color: IANGEL_THEME.skyDeep, background: IANGEL_THEME.white }}
          >
            Tel. 2
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => void enablePush()}
        className="mt-3 w-full rounded-[16px] px-4 py-3 text-sm font-semibold text-white"
        style={{ background: IANGEL_THEME.skyDeep }}
      >
        Avisos en este teléfono
      </button>
      <p className="mt-2 text-xs" style={{ color: IANGEL_THEME.muted }}>
        iPhone: Safari → Compartir → Agregar a pantalla de inicio, luego activa avisos.
      </p>
      <div className="mt-4 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('rounded-2xl px-3 py-2 text-sm', message.actor === 'system' && 'italic')}
            style={{
              background: message.actor === 'customer' ? IANGEL_THEME.skySoft : IANGEL_THEME.white,
              color: IANGEL_THEME.ink,
              border: `1px solid ${IANGEL_THEME.line}`,
            }}
          >
            {message.body}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {quick.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void send(item)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: IANGEL_THEME.skySoft, color: IANGEL_THEME.skyDeep }}
          >
            {item}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe al rider"
          className="min-h-12 flex-1 rounded-2xl border px-3 text-sm"
          style={{ borderColor: IANGEL_THEME.line, color: IANGEL_THEME.ink }}
        />
        <button
          type="submit"
          className="rounded-2xl px-4 text-sm font-semibold text-white"
          style={{ background: IANGEL_THEME.skyDeep }}
        >
          Enviar
        </button>
      </form>
      {delivered && !rated ? (
        <div className="mt-4 rounded-[20px] border p-3" style={{ borderColor: IANGEL_THEME.line, background: IANGEL_THEME.white }}>
          <p className="text-sm font-semibold">Califica tu envío (privado, 24 h)</p>
          <div className="mt-2 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStars(value)}
                className="h-11 w-11 rounded-xl text-sm font-bold"
                style={{
                  background: stars >= value ? IANGEL_THEME.skyDeep : IANGEL_THEME.skySoft,
                  color: stars >= value ? IANGEL_THEME.white : IANGEL_THEME.ink,
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Comentario privado (no se publica en el chat)"
            className="mt-2 w-full rounded-2xl border p-2 text-sm"
            rows={2}
          />
          <button
            type="button"
            className="mt-2 w-full rounded-[16px] py-3 text-sm font-semibold text-white"
            style={{ background: IANGEL_THEME.skyDeep }}
            onClick={async () => {
              const response = await fetch(`/api/orders/${order.id}/rate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, stars, comment }),
              });
              if (response.ok) setRated(true);
            }}
            disabled={stars < 1}
          >
            Enviar calificación
          </button>
        </div>
      ) : null}
    </section>
  );
}
