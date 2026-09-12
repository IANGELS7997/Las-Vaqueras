'use client';

import { useEffect, useRef, useState } from 'react';

const ALERT_EVENT = 'lv-kitchen-alert';
const SOUND_SRC = '/sounds/new-order.wav?v=3c';
const MOTIF = [
  { freq: 349, dur: 0.1, peak: 0.16 },
  { freq: 440, dur: 0.1, peak: 0.16 },
  { freq: 349, dur: 0.1, peak: 0.16 },
  { freq: 440, dur: 0.1, peak: 0.16 },
] as const;
const PHRASES = 8;
const PHRASE_REST = 0.1;

function playBeep(ctx: AudioContext) {
  const now = ctx.currentTime;
  let cursor = now;
  for (let phrase = 0; phrase < PHRASES; phrase += 1) {
    for (const step of MOTIF) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = step.freq;
      const end = cursor + step.dur;
      gain.gain.setValueAtTime(0.0001, cursor);
      gain.gain.exponentialRampToValueAtTime(step.peak, cursor + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(cursor);
      osc.stop(end + 0.02);
      cursor = end + 0.035;
    }
    cursor += PHRASE_REST;
  }
}

function playBeepTwice(ctx: AudioContext) {
  playBeep(ctx);
}

export function KitchenShift({ onShiftChange }: { onShiftChange?: (active: boolean) => void }) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const playFullAlert = () => {
    const fallback = () => {
      if (ctxRef.current) playBeepTwice(ctxRef.current);
    };

    const alertAudio = audioRef.current;
    if (!alertAudio) {
      fallback();
      return;
    }

    let repeatsLeft = 1;
    alertAudio.onended = () => {
      if (repeatsLeft <= 0) {
        alertAudio.onended = null;
        return;
      }
      repeatsLeft -= 1;
      alertAudio.currentTime = 0;
      void alertAudio.play().catch(fallback);
    };
    alertAudio.currentTime = 0;
    void alertAudio.play().catch(fallback);
  };

  useEffect(() => {
    if (!isShiftActive) return;
    const onAlert = () => playFullAlert();
    window.addEventListener(ALERT_EVENT, onAlert);
    return () => window.removeEventListener(ALERT_EVENT, onAlert);
  }, [isShiftActive]);

  const handleStartShift = () => {
    setIsShiftActive(true);
    onShiftChange?.(true);

    void (async () => {
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = ctxRef.current ?? new Ctx();
        ctxRef.current = ctx;
        if (ctx.state === 'suspended') await ctx.resume();
      } catch {
        /* El turno ya arrancó aunque el navegador bloquee audio. */
      }

      const alertAudio = new Audio(SOUND_SRC);
      audioRef.current = alertAudio;
      void alertAudio.play().catch(() => {
        /* Sin archivo o autoplay: usamos el timbre de AudioContext. */
      });
    })();
  };

  if (!isShiftActive) {
    return (
      <div className="mb-6 rounded-lg border border-amber-800 bg-amber-950 p-4 text-center">
        <button
          type="button"
          onClick={handleStartShift}
          className="w-full rounded-md bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-700"
        >
          🔊 INICIAR TURNO Y ACTIVAR ALERTAS SONORAS
        </button>
        <p className="mt-2 text-xs text-amber-300">
          Requerido para autorizar sonido e impresión automática de comandas en Chrome/Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-md border border-emerald-800 bg-emerald-950 p-3 text-sm font-medium text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2">
        <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-emerald-400" />
        Turno activo — alerta de pedido e impresión al pagar
      </span>
      <button
        type="button"
        onClick={playFullAlert}
        className="min-h-11 rounded-md border border-emerald-700 px-4 py-2 text-sm text-emerald-50 transition-colors hover:bg-emerald-900"
      >
        Probar alerta
      </button>
    </div>
  );
}

export function notifyKitchenNewOrder() {
  window.dispatchEvent(new CustomEvent(ALERT_EVENT));
}
