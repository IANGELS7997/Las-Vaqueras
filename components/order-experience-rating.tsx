'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type RatingState = { stars: number; comment: string | null } | null;

export function OrderExperienceRating({ orderId, delivered }: { orderId: string; delivered: boolean }) {
  const [ready, setReady] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [rating, setRating] = useState<RatingState>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    if (!delivered) {
      setReady(true);
      setCanRate(false);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const preset = Number(params.get('estrellas'));
    const token = params.get('s') || '';
    if (preset >= 1 && preset <= 5) setStars(preset);
    let cancelled = false;
    const query = token ? `?s=${encodeURIComponent(token)}` : '';
    void fetch(`/api/orders/${orderId}/experience${query}`, { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        setCanRate(Boolean(payload.canRate));
        if (payload.rating) {
          setRating({ stars: Number(payload.rating.stars) || 0, comment: payload.rating.comment || null });
          setStars(Number(payload.rating.stars) || preset || 0);
          setComment(String(payload.rating.comment || ''));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, delivered]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const token = new URLSearchParams(window.location.search).get('s') || '';
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/orders/${orderId}/experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment, token }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'No se guardó la calificación');
      setRating({ stars: Number(payload.rating?.stars) || stars, comment: payload.rating?.comment || comment || null });
      setOk('Gracias. Ya recibimos tu calificación.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se guardó');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !canRate) return null;
  if (rating && ok) {
    return <p className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-white">{ok}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-left">
      <h3 className="text-sm font-bold text-white">¿Cómo estuvo tu pedido?</h3>
      <p className="mt-1 text-xs text-muted-foreground">Elige de 1 a 5 estrellas y, si quieres, deja un comentario.</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} estrellas`}
            onClick={() => setStars(value)}
            className="rounded-md p-1"
          >
            <Star className={`h-7 w-7 ${value <= stars ? 'fill-orange-500 text-orange-500' : 'text-neutral-600'}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value.slice(0, 400))}
        placeholder="Comentario"
        className="mt-3 w-full rounded-xl border border-neutral-700 bg-black px-3 py-2 text-sm text-white"
        rows={3}
      />
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {ok ? <p className="mt-2 text-xs text-green-400">{ok}</p> : null}
      <button
        type="submit"
        disabled={busy || stars < 1}
        className="mt-3 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
      >
        {busy ? 'Enviando…' : 'Enviar calificación'}
      </button>
    </form>
  );
}
