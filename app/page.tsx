'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bike, Store } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { useFulfillment } from '@/lib/fulfillment-context';
import { getNextOpenLabel, getOpenStatus } from '@/lib/restaurant';
import { cn } from '@/lib/utils';

function FulfillmentGatePage() {
  const router = useRouter();
  const { ready, setMode, enableBrowseMenu } = useFulfillment();
  const searchParams = useSearchParams();
  const prueba = searchParams.get('prueba') === '1';
  const [open, setOpen] = useState({ isOpen: false, label: 'Cerrado' });
  const [nextHours, setNextHours] = useState('');

  useEffect(() => {
    if (prueba) {
      try {
        sessionStorage.setItem('lv-prueba-open', '1');
        document.cookie = 'lv_prueba=1; Path=/; Max-Age=7200; SameSite=Lax';
      } catch {
        /* ignore */
      }
      setOpen({ isOpen: true, label: 'Abierto (prueba)' });
      return;
    }
    const update = () => {
      const now = new Date();
      setOpen(getOpenStatus(now));
      setNextHours(getNextOpenLabel(now));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [prueba]);

  const choose = (mode: 'delivery' | 'pickup') => {
    if (!open.isOpen) return;
    setMode(mode);
    router.push('/menu');
  };

  if (!ready) {
    return <div className="min-h-[50vh]" />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-10">
      <BrandLogo className="h-20 sm:h-24" priority />
      <h1 className="mt-6 text-center text-2xl font-bold text-white sm:text-3xl">¿Cómo quieres tu pedido?</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {prueba ? 'Modo prueba: el local está abierto solo en esta sesión.' : 'Elige una opción para ver el menú.'}
      </p>

      <div className="mt-8 grid w-full grid-cols-2 gap-3 sm:gap-4">
        <button
          type="button"
          disabled={!open.isOpen}
          onClick={() => choose('delivery')}
          className={cn(
            'relative min-h-[140px] overflow-hidden rounded-3xl border border-border/60 bg-card p-4 text-left transition-all sm:min-h-[220px] sm:p-6',
            open.isOpen
              ? 'hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/15'
              : 'cursor-not-allowed'
          )}
        >
          {!open.isOpen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-grayscale">
              <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wide text-white sm:px-4 sm:py-2 sm:text-sm">
                CERRADO
              </span>
            </div>
          )}
          <Bike className={cn('h-8 w-8 text-brand-500 sm:h-12 sm:w-12', !open.isOpen && 'grayscale')} />
          <p className="mt-3 text-sm font-bold leading-snug text-white sm:mt-4 sm:text-xl">
            Entrega a domicilio
          </p>
        </button>

        <button
          type="button"
          disabled={!open.isOpen}
          onClick={() => choose('pickup')}
          className={cn(
            'relative min-h-[140px] overflow-hidden rounded-3xl border border-border/60 bg-card p-4 text-left transition-all sm:min-h-[220px] sm:p-6',
            open.isOpen
              ? 'hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/15'
              : 'cursor-not-allowed'
          )}
        >
          {!open.isOpen && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 backdrop-grayscale">
              <span className="rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold tracking-wide text-white sm:px-4 sm:py-2 sm:text-sm">
                CERRADO
              </span>
            </div>
          )}
          <Store className={cn('h-8 w-8 text-brand-500 sm:h-12 sm:w-12', !open.isOpen && 'grayscale')} />
          <p className="mt-3 text-sm font-bold leading-snug text-white sm:mt-4 sm:text-xl">
            Recoger en tienda
          </p>
        </button>
      </div>

      {!open.isOpen && (
        <div className="mt-8 w-full max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            Estamos cerrados. Abrimos {nextHours}.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-4 border-border/60 bg-card text-white hover:bg-secondary"
          >
            <Link href="/menu" scroll onClick={() => enableBrowseMenu()}>
              Ver menú
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <FulfillmentGatePage />
    </Suspense>
  );
}
