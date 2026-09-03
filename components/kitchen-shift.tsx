'use client';

import { useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KitchenShift() {
  const [shiftActive, setShiftActive] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playAlert = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.3, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.start(now + start);
      osc.stop(now + start + duration);
    };

    playTone(880, 0, 0.15);
    playTone(1100, 0.18, 0.15);
    playTone(880, 0.36, 0.15);
  }, []);

  const handleStartShift = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setShiftActive(true);
      playAlert();
    } catch {
      setShiftActive(true);
    }
  };

  return (
    <div
      className={cn(
        'rounded-2xl border-2 p-6 transition-all duration-500',
        shiftActive
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-green-500/40 bg-green-500/10'
      )}
    >
      {!shiftActive ? (
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
            <VolumeX className="h-7 w-7 text-green-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Turno inactivo</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Activa el turno para recibir alertas sonoras de nuevos pedidos.
          </p>
          <button
            onClick={handleStartShift}
            className="w-full rounded-xl bg-green-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-green-500/30 transition-all hover:bg-green-600 active:scale-[0.98] sm:w-auto"
          >
            <Volume2 className="mr-2 inline h-5 w-5" />
            INICIAR TURNO Y ACTIVAR ALERTAS SONORAS
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
              <Volume2 className="h-6 w-6 text-green-400" />
              <span className="absolute inset-0 rounded-full border-2 border-green-500 animate-pulse-ring" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Turno activo</h2>
              <p className="text-xs text-green-400">Alertas sonoras activadas</p>
            </div>
          </div>
          <button
            onClick={playAlert}
            className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/30"
          >
            <Bell className="mr-1.5 inline h-4 w-4" />
            Probar sonido
          </button>
        </div>
      )}
    </div>
  );
}

export { playAlert };
