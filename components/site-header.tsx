'use client';

import Link from 'next/link';
import { MapPin, Clock, Phone, ChefHat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { RESTAURANT_INFO, getOpenStatus, getTodayHours } from '@/lib/restaurant';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

export function SiteHeader() {
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <a
            href="/admin/kitchen"
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-brand-500/50 hover:bg-brand-500 hover:text-white"
          >
            <ChefHat className="h-3.5 w-3.5" />
            Cocina
          </a>
          <Link href="/" className="flex items-center gap-2.5">
            <BrandLogo className="h-14" priority />
            <div>
              <h1 className="text-lg font-bold leading-none text-white">Las Vaqueras</h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Chihuahua, México</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
              status.isOpen
                ? 'bg-green-500/15 text-green-400'
                : 'bg-red-500/15 text-red-400'
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
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-1.5 px-4 pb-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-brand-500" />
          {RESTAURANT_INFO.address}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-brand-500" />
          {todayHours}
        </span>
        <a
          href={`tel:${RESTAURANT_INFO.phone}`}
          className="flex items-center gap-1.5 transition-colors hover:text-brand-400"
        >
          <Phone className="h-3.5 w-3.5 text-brand-500" />
          {RESTAURANT_INFO.phone}
        </a>
      </div>
    </header>
  );
}
