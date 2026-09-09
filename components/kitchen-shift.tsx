'use client';

import { useEffect, useRef, useState } from 'react';

const ALERT_EVENT = 'lv-kitchen-alert';
const SOUND_SRC = '/sounds/new-order.wav';
const CHIME_NOTES = [
  { freq: 523.25, at: 0, dur: 0.85 },
  { freq: 659.25, at: 0.38, dur: 0.9 },
  { freq: 783.99, at: 0.76, dur: 1.05 },
  { freq: 1046.5, at: 1.2, dur: 1.35 },
] as const;
const CHIME_GAP_MS = 2750;

function playBeep(ctx: AudioContext) {
  const now = ctx.currentTime;
  for (const note of CHIME_NOTES) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note.freq;
    const start = now + note.at;
    const end = start + note.dur;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}

function playBeepTwice(ctx: AudioContext) {
  playBeep(ctx);
  window.setTimeout(() => playBeep(ctx), CHIME_GAP_MS);
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
    <div className="mb-6 flex items-center justify-between rounded-md border border-emerald-800 bg-emerald-950 p-3 text-sm font-medium text-emerald-200">
      <span>🟢 Turno Activo — Alertas e impresión de comandas al pagar</span>
      <button
        type="button"
        onClick={playFullAlert}
        className="rounded-md border border-emerald-700 px-3 py-1 text-xs text-emerald-100 transition-colors hover:bg-emerald-900"
      >
        Probar sonido
      </button>
      <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
    </div>
  );
}

export function notifyKitchenNewOrder() {
  window.dispatchEvent(new CustomEvent(ALERT_EVENT));
}
