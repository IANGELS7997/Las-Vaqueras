'use client';

import { useEffect, useRef, useState } from 'react';

const ALERT_EVENT = 'lv-kitchen-alert';
const SOUND_SRC = '/sounds/new-order.wav';

export function KitchenShift({ onShiftChange }: { onShiftChange?: (active: boolean) => void }) {
  const [isShiftActive, setIsShiftActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playFullAlert = () => {
    const alertAudio = audioRef.current;
    if (!alertAudio) return;
    alertAudio.currentTime = 0;
    void alertAudio.play().catch((err) => console.error('Error al reproducir alerta:', err));
  };

  useEffect(() => {
    if (!isShiftActive) return;
    const onAlert = () => playFullAlert();
    window.addEventListener(ALERT_EVENT, onAlert);
    return () => window.removeEventListener(ALERT_EVENT, onAlert);
  }, [isShiftActive]);

  const handleStartShift = () => {
    const alertAudio = new Audio(SOUND_SRC);
    alertAudio
      .play()
      .then(() => {
        alertAudio.pause();
        alertAudio.currentTime = 0;
        audioRef.current = alertAudio;
        setIsShiftActive(true);
        onShiftChange?.(true);
      })
      .catch((err) => console.error('Error al activar audio:', err));
  };

  if (!isShiftActive) {
    return (
      <div className="mb-6 rounded-lg border border-amber-800 bg-amber-950 p-4 text-center">
        <button
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
