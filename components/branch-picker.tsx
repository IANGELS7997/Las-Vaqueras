'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { BRANCHES, isBranchOpen, nearestBranch, type Branch } from '@/lib/branches';
import { cn } from '@/lib/utils';

type LocationState = 'asking' | 'nearest' | 'all';

export function BranchPicker({ onSelect }: { onSelect: (branch: Branch) => void }) {
  const [locationState, setLocationState] = useState<LocationState>('asking');
  const [nearest, setNearest] = useState<Branch | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState('all');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearest(nearestBranch(position.coords.latitude, position.coords.longitude));
        setLocationState('nearest');
      },
      () => setLocationState('all'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const branches = locationState === 'nearest' && nearest ? [nearest] : locationState === 'all' ? BRANCHES : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-10">
      <BrandLogo className="h-20 sm:h-24" priority />
      <h1 className="mt-6 text-center text-2xl font-bold text-white sm:text-3xl">Elige tu sucursal</h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        {locationState === 'asking'
          ? 'Pedimos tu ubicación para recomendarte la sucursal más cercana.'
          : locationState === 'nearest'
            ? 'Esta es la sucursal más cercana. Tócala para continuar.'
            : 'Elige la sucursal donde quieres pedir.'}
      </p>

      <div className="mt-8 grid w-full gap-3">
        {branches.map((branch) => {
          const open = isBranchOpen(branch.id, now);
          const recommended = locationState === 'nearest' && nearest?.id === branch.id;
          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => onSelect(branch)}
              className="rounded-3xl border border-border/60 bg-card p-5 text-left transition-all hover:border-brand-500/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-white">{branch.shortName}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {branch.address}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{branch.hoursLabel}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {recommended ? (
                    <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[10px] font-bold text-brand-500">
                      Recomendada
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      open ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                    )}
                  >
                    {open ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {locationState === 'nearest' ? (
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-brand-500 hover:underline"
          onClick={() => setLocationState('all')}
        >
          Elegir otra sucursal
        </button>
      ) : null}
    </div>
  );
}
