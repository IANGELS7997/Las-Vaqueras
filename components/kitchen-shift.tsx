'use client';

import { useEffect, useRef, useState } from 'react';

const ALERT_EVENT = 'lv-kitchen-alert';
const SOUND_SRC = '/sounds/new-order.wav';

function playBeep(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.35);
}

export function KitchenShift({ onShiftChange }: { onShiftChange?: (active: boolean) => void }) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const playFullAlert = () => {
    const alertAudio = audioRef.current;
    if (alertAudio) {
      alertAudio.currentTime = 0;
      void alertAudio.play().catch(() => {
        if (ctxRef.current) playBeep(ctxRef.current);
      });
      return;
    }
    if (ctxRef.current) playBeep(ctxRef.current);
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
        playBeep(ctx);
      } catch {
        /* El turno ya arrancó aunque el navegador bloquee audio. */
      }

      const alertAudio = new Audio(SOUND_SRC);
      audioRef.current = alertAudio;
      void alertAudio
        .play()
        .then(() => {
          alertAudio.pause();
          alertAudio.currentTime = 0;
        })
        .catch(() => {
          /* Sin archivo o autoplay: usamos el beep de AudioContext. */
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
