'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { customerInstallPath } from '@/lib/customer-mail';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isInstalled() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export function PwaInstallHint({
  autoPrompt = false,
  orderId,
}: {
  autoPrompt?: boolean;
  orderId?: string;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
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

  const openInstall = async () => {
    if (orderId) {
      setOpening(true);
      const secret = new URLSearchParams(window.location.search).get('s') || '';
      if (secret.length >= 16) {
        router.push(customerInstallPath(orderId, secret));
        return;
      }
      const response = await fetch('/api/customer/install-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && typeof payload.path === 'string' && payload.path.startsWith('/instalar')) {
        router.push(payload.path);
        return;
      }
      setOpening(false);
    }
    if (installEvent) {
      void installEvent.prompt().finally(() => setInstallEvent(null));
      return;
    }
    setNote(
      isIos
        ? 'En iPhone: Compartir → Agregar a pantalla de inicio'
        : 'Desde el menú del navegador, elige Agregar a la pantalla de inicio'
    );
  };

  if (installed) {
    if (!autoPrompt) return null;
    return <p className="text-sm text-muted-foreground">Las Vaqueras ya está en tu inicio.</p>;
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        className="w-full bg-brand-500 text-white hover:bg-brand-600"
        disabled={opening}
        onClick={() => {
          void openInstall();
        }}
      >
        Agregar app al inicio
      </Button>
      {note ? <p className="mt-2 text-center text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}
