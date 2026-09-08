'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Store } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { useFulfillment } from '@/lib/fulfillment-context';
import { getNextOpenLabel, getOpenStatus } from '@/lib/restaurant';
import { cn } from '@/lib/utils';

export default function FulfillmentGatePage() {
  const router = useRouter();
  const { ready, setMode, enableBrowseMenu } = useFulfillment();
  const [open, setOpen] = useState({ isOpen: false, label: 'Cerrado' });
  const [nextHours, setNextHours] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setOpen(getOpenStatus(now));
      setNextHours(getNextOpenLabel(now));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  const choose = (mode: 'delivery' | 'pickup') => {
    if (!open.isOpen) return;
    setMode(mode);
    router.push('/menu');
  };

  const viewMenu = () => {
    enableBrowseMenu();
    router.push('/menu');
  };

  if (!ready) {
    return <div className="min-h-[50vh]" />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-10">
      <BrandLogo className="h-20 sm:h-24" priority />
      <h1 className="mt-6 text-center text-2xl font-bold text-white sm:text-3xl">¿Cómo quieres tu pedido?</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Elige una opción para ver el menú.</p>

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={!open.isOpen}
          onClick={() => choose('delivery')}
          className={cn(
            'relative min-h-[220px] overflow-hidden rounded-3xl border border-border/60 bg-card p-6 text-left transition-all',
            open.isOpen
              ? 'hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/15'
              : 'cursor-not-allowed'
          )}
        >
          {!open.isOpen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-grayscale">
              <span className="rounded-lg bg-black/70 px-4 py-2 text-sm font-bold tracking-wide text-white">
                CERRADO
              </span>
            </div>
          )}
          <Bike className={cn('h-12 w-12 text-brand-500', !open.isOpen && 'grayscale')} />
          <p className="mt-4 text-xl font-bold text-white">Entrega a domicilio</p>
        </button>

        <button
          type="button"
          disabled={!open.isOpen}
          onClick={() => choose('pickup')}
          className={cn(
            'relative min-h-[220px] overflow-hidden rounded-3xl border border-border/60 bg-card p-6 text-left transition-all',
            open.isOpen
              ? 'hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/15'
              : 'cursor-not-allowed'
          )}
        >
          {!open.isOpen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-grayscale">
              <span className="rounded-lg bg-black/70 px-4 py-2 text-sm font-bold tracking-wide text-white">
                CERRADO
              </span>
            </div>
          )}
          <Store className={cn('h-12 w-12 text-brand-500', !open.isOpen && 'grayscale')} />
          <p className="mt-4 text-xl font-bold text-white">Recoger en tienda</p>
        </button>
      </div>

      {!open.isOpen && (
        <div className="mt-8 w-full max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            Estamos cerrados. Abrimos {nextHours}. Puedes ver el menú, pero no se puede pedir hasta que abramos.
          </p>
          <Button
            onClick={viewMenu}
            variant="outline"
            className="mt-4 border-border/60 bg-card text-white hover:bg-secondary"
          >
            Ver menú
          </Button>
        </div>
      )}
    </div>
  );
}
