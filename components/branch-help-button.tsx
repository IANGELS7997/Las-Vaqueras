'use client';

import { Phone } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { branchById } from '@/lib/branches';
import { useFulfillment } from '@/lib/fulfillment-context';

function isPurchasePath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/menu' ||
    pathname === '/checkout' ||
    pathname === '/checkout/complete' ||
    /^\/orders\/[^/]+$/.test(pathname)
  );
}

export function BranchHelpButton() {
  const pathname = usePathname();
  const { ready, branchId } = useFulfillment();
  if (!ready || !branchId || !isPurchasePath(pathname)) return null;

  const branch = branchById(branchId);

  return (
    <a
      href={`tel:${branch.phone}`}
      aria-label={`Ayuda, llamar a ${branch.shortName}`}
      className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-2xl bg-brand-500 px-2 py-3 text-[11px] font-semibold leading-none text-white shadow-lg hover:bg-brand-600"
    >
      <Phone className="h-4 w-4 shrink-0" aria-hidden />
      Ayuda
    </a>
  );
}
