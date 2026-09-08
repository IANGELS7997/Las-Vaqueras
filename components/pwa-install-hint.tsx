'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstallHint() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center">
      <p className="text-sm font-semibold text-white">
        Agrega la app a tu pantalla de inicio para ver tus promociones
      </p>
      {installEvent ? (
        <Button
          className="mt-3 bg-brand-500 text-white hover:bg-brand-600"
          onClick={async () => {
            await installEvent.prompt();
            setInstallEvent(null);
          }}
        >
          Agregar a inicio
        </Button>
      ) : isIos ? (
        <p className="mt-2 text-xs text-muted-foreground">
          En iPhone: Compartir → Agregar a pantalla de inicio
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Desde el menú del navegador, elige Agregar a la pantalla de inicio
        </p>
      )}
    </div>
  );
}
