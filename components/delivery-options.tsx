'use client';

import type { DeliveryProvider } from '@/types';
import type { RoutingOption, RoutingResult } from '@/lib/iangel-routing';
import { COPY } from '@/lib/iangel-copy';
import { formatMXN } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export function DeliveryOptions({
  routing,
  selected,
  onSelect,
  expiresAt,
  leaveAtDoor,
  onLeaveAtDoor,
  gatedCommunity,
  onGated,
  quoting,
  quoteError,
}: {
  routing: RoutingResult | null;
  selected: DeliveryProvider | null;
  onSelect: (kind: Exclude<DeliveryProvider, 'pickup'>) => void;
  expiresAt: string | null;
  leaveAtDoor: boolean;
  onLeaveAtDoor: (value: boolean) => void;
  gatedCommunity: boolean;
  onGated: (value: boolean) => void;
  quoting: boolean;
  quoteError: string;
}) {
  const remaining = expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null;

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox checked={gatedCommunity} onCheckedChange={(value) => onGated(value === true)} className="mt-0.5" />
        <span>Fraccionamiento cerrado. En horario IANGEL el envío lo cubre el rider de la casa.</span>
      </label>
      {quoting ? <p className="text-xs text-muted-foreground">Cotizando envío…</p> : null}
      {quoteError ? <p className="text-xs text-red-400">{quoteError}</p> : null}
      {routing?.blocked ? <p className="text-sm text-red-400">{routing.blockedReason}</p> : null}
      {routing && !routing.blocked ? (
        <div className="space-y-2">
          {routing.options.map((option) => (
            <OptionCard
              key={option.kind}
              option={option}
              selected={selected === option.kind}
              onSelect={() => onSelect(option.kind)}
            />
          ))}
          <p className="text-xs text-muted-foreground">{COPY.quoteTtl}</p>
          {remaining != null ? (
            <p className="text-xs text-brand-400">Caduca en {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
          ) : null}
        </div>
      ) : null}
      <label className="flex items-start gap-3 text-sm text-muted-foreground">
        <Checkbox checked={leaveAtDoor} onCheckedChange={(value) => onLeaveAtDoor(value === true)} className="mt-0.5" />
        <span>{COPY.leaveAtDoor}</span>
      </label>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: RoutingOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left',
        selected ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{option.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.body}</p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-brand-400">{formatMXN(option.customerFee)}</span>
      </div>
    </button>
  );
}
