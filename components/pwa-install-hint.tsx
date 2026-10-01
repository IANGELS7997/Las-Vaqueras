'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isInstalled() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function PwaInstallHint({ autoPrompt = false }: { autoPrompt?: boolean }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    setIsIos(ios);
    if (isInstalled()) {
      setInstalled(true);
      return;
    }
    if (ios && autoPrompt) {
      setNote('En iPhone: Compartir → Agregar a pantalla de inicio');
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallEvent(promptEvent);
      if (autoPrompt) {
        void promptEvent.prompt().finally(() => setInstallEvent(null));
      }
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [autoPrompt]);

  if (installed) {
    if (!autoPrompt) return null;
    return <p className="text-sm text-muted-foreground">Las Vaqueras ya está en tu inicio.</p>;
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        className="w-full bg-brand-500 text-white hover:bg-brand-600"
        onClick={() => {
          if (installEvent) {
            void installEvent.prompt().finally(() => setInstallEvent(null));
            return;
          }
          setNote(
            isIos
              ? 'En iPhone: Compartir → Agregar a pantalla de inicio'
              : 'Desde el menú del navegador, elige Agregar a la pantalla de inicio'
          );
        }}
      >
        Agregar app al inicio
      </Button>
      {note ? <p className="mt-2 text-center text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
