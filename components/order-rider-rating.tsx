'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type RatingState = {
  stars: number;
  comment: string | null;
  createdAt?: string;
} | null;

export function OrderRiderRating({ orderId, delivered }: { orderId: string; delivered: boolean }) {
  const [ready, setReady] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [rating, setRating] = useState<RatingState>(null);
  const [stars, setStars] = useState(5);
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
    let cancelled = false;
    void fetch(`/api/orders/${orderId}/rating`, { cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        setCanRate(Boolean(payload.canRate));
        if (payload.rating) {
          setRating({
            stars: Number(payload.rating.stars) || 0,
            comment: payload.rating.comment || null,
            createdAt: payload.rating.createdAt,
          });
          setStars(Number(payload.rating.stars) || 5);
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
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars, comment }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'No se guardó la calificación');
      setRating({
        stars: Number(payload.rating?.stars) || stars,
        comment: payload.rating?.comment || comment || null,
        createdAt: payload.rating?.createdAt,
      });
      setOk('Gracias · tu calificación ya la ve el repartidor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se guardó');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !canRate) return null;

  return (
    <div className="mt-4 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-left">
      <h3 className="mb-1 text-sm font-bold text-white">Califica a tu repartidor IANGEL</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Tu comentario aparece en el perfil del rider para mejorar el servicio.
      </p>
      {rating ? (
        <div className="mb-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-sm font-semibold text-orange-400">
            {'★'.repeat(rating.stars)}
            <span className="ml-2 text-muted-foreground">{rating.stars}/5</span>
          </p>
          {rating.comment ? <p className="mt-1 text-sm text-white">{rating.comment}</p> : null}
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} estrellas`}
              onClick={() => setStars(value)}
              className="rounded-md p-1 text-orange-400 transition hover:scale-105"
            >
              <Star className={`h-6 w-6 ${value <= stars ? 'fill-orange-400' : 'fill-transparent'}`} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={400}
          rows={3}
          placeholder="Comentario opcional (amabilidad, puntualidad, cuidado del pedido…)"
          className="w-full rounded-xl border border-border/60 bg-neutral-950 px-3 py-2 text-sm text-white outline-none ring-orange-500/40 focus:ring"
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        {ok ? <p className="text-xs text-emerald-400">{ok}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60"
        >
          {busy ? 'Guardando…' : rating ? 'Actualizar calificación' : 'Enviar calificación'}
        </button>
      </form>
    </div>
  );
}
