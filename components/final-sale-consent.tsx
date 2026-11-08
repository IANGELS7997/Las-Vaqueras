'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface FinalSaleConsentProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  message: string;
  error?: string;
}

export function FinalSaleConsent({ checked, onCheckedChange, message, error }: FinalSaleConsentProps) {
  return (
    <>
      <label className="mb-4 flex items-start gap-3">
        <span className="relative mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
          {checked ? null : (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-1 animate-pulse-ring rounded-full border-2 border-brand-500 motion-reduce:animate-none"
            />
          )}
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => onCheckedChange(value === true)}
            aria-required="true"
            className={cn('relative rounded-full', checked ? null : 'border-brand-500')}
          />
        </span>
        <span className="min-w-0">
          {checked ? null : (
            <span className="mb-1 block text-xs font-semibold leading-none text-brand-400">Obligatorio</span>
          )}
          <span className="text-sm leading-relaxed text-muted-foreground">
            {message}{' '}
            <a href="/terminos" className="text-brand-400 underline-offset-2 hover:underline">
              Términos
            </a>
            {' · '}
            <a href="/faq" className="text-brand-400 underline-offset-2 hover:underline">
              Preguntas frecuentes
            </a>
            .
          </span>
        </span>
      </label>
      {error ? <p className="mb-3 text-xs text-red-400">{error}</p> : null}
    </>
  );
}
