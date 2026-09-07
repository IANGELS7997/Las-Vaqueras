'use client';

import type { ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ProductOptionRowProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}

export function ProductOptionRow({ checked, onCheckedChange, children }: ProductOptionRowProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
        checked
          ? 'border-brand-500 bg-brand-500/10 text-white'
          : 'border-border text-muted-foreground hover:border-brand-500/40'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      {children}
    </label>
  );
}
