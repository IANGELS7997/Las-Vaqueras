'use client';

import Link from 'next/link';
import { MapPin, Clock, Phone, Mail, Bike, Store } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RESTAURANT_INFO, getOpenStatus, getTodayHours } from '@/lib/restaurant';
import { BrandLogo } from '@/components/brand-logo';
import { CustomerAccountSheet } from '@/components/customer-account-sheet';
import { useFulfillment } from '@/lib/fulfillment-context';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const { mode, setMode, ready } = useFulfillment();
  const [status, setStatus] = useState({ isOpen: false, label: 'Cerrado' });
  const [todayHours, setTodayHours] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setStatus(getOpenStatus(now));
      setTodayHours(getTodayHours(now));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  if (pathname.startsWith('/admin') || pathname.startsWith('/connect')) return null;

  const showModeSwitch = ready && mode && pathname !== '/' && status.isOpen;

  const openBadge = (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs',
        status.isOpen ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status.isOpen ? 'bg-green-400 animate-pulse' : 'bg-red-400'
        )}
      />
      {status.label}
    </div>
  );

  const modeSwitch = showModeSwitch ? (
    <div className="flex w-full items-center rounded-full border border-border/60 bg-card p-0.5 sm:w-auto">
      <button
        type="button"
        onClick={() => setMode('delivery')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-semibold sm:flex-none sm:px-2.5 sm:py-1',
          mode === 'delivery' ? 'bg-brand-500 text-white' : 'text-muted-foreground'
        )}
      >
        <Bike className="h-3 w-3" />
        Domicilio
      </button>
      <button
        type="button"
        onClick={() => setMode('pickup')}
        className={cn(
          'flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-semibold sm:flex-none sm:px-2.5 sm:py-1',
          mode === 'pickup' ? 'bg-brand-500 text-white' : 'text-muted-foreground'
        )}
      >
        <Store className="h-3 w-3" />
        Recoger
      </button>
    </div>
  ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <CustomerAccountSheet />
            <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
              <BrandLogo className="h-10 shrink-0 sm:h-14" priority />
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold leading-none text-white sm:text-lg">
                  Las Vaqueras
                </h1>
                <p className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                  Chihuahua, México
                </p>
              </div>
            </Link>
          </div>
          <div className="sm:hidden">{openBadge}</div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end sm:gap-3">
          {modeSwitch}
          <div className="hidden sm:block">{openBadge}</div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-3 gap-y-1 px-4 pb-3 text-[11px] text-muted-foreground sm:flex sm:flex-row sm:items-center sm:gap-4 sm:text-xs">
        <span className="col-span-2 flex min-w-0 items-start gap-1.5 sm:col-auto sm:items-center">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500 sm:mt-0" />
          <span className="leading-snug sm:truncate">{RESTAURANT_INFO.address}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-brand-500" />
          {todayHours}
        </span>
        <a
          href={`tel:${RESTAURANT_INFO.phone}`}
          className="flex items-center gap-1.5 transition-colors hover:text-brand-400"
        >
          <Phone className="h-3.5 w-3.5 shrink-0 text-brand-500" />
          {RESTAURANT_INFO.phone}
        </a>
        <a
          href={`mailto:${RESTAURANT_INFO.email}`}
          className="col-span-2 flex items-center gap-1.5 transition-colors hover:text-brand-400 sm:col-auto"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-brand-500" />
          {RESTAURANT_INFO.email}
        </a>
      </div>
    </header>
  );
}
