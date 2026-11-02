'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Store } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';
import { BranchPicker } from '@/components/branch-picker';
import { branchById, branchNextOpenLabel, isBranchOpen } from '@/lib/branches';
import { useFulfillment } from '@/lib/fulfillment-context';
import { useManualClosure } from '@/components/use-manual-closure';
import { cn } from '@/lib/utils';

function FulfillmentChoice({
  icon: Icon,
  label,
  closed,
  onChoose,
}: {
  icon: typeof Bike;
  label: string;
  closed: boolean;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      disabled={closed}
      onClick={onChoose}
      className={cn(
        'flex min-h-[168px] flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card p-5 text-center transition-all sm:min-h-[220px] sm:gap-4 sm:p-8',
        closed
          ? 'cursor-not-allowed'
          : 'hover:border-brand-500/60 hover:shadow-lg hover:shadow-brand-500/15'
      )}
    >
      <Icon className={cn('h-8 w-8 shrink-0 text-brand-500 sm:h-12 sm:w-12', closed && 'grayscale')} />
      {closed ? (
        <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold tracking-wide text-white sm:text-xs">
          CERRADO
        </span>
      ) : null}
      <p className="min-h-[2.5em] text-sm font-bold leading-snug text-white sm:min-h-0 sm:text-xl">{label}</p>
    </button>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { ready, branchId, setBranch, clearBranch, setMode, enableBrowseMenu } = useFulfillment();
  const [clock, setClock] = useState(() => new Date());
  const manualClosed = useManualClosure();

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isOpen = branchId ? isBranchOpen(branchId, clock) && !manualClosed : false;
  const open = { isOpen, label: isOpen ? 'Abierto' : 'Cerrado' };
  const nextHours = branchId ? branchNextOpenLabel(branchId, clock) : '';

  const choose = (mode: 'delivery' | 'pickup') => {
    if (!open.isOpen) return;
    setMode(mode);
    router.push('/menu');
  };

  if (!ready) {
    return <div className="min-h-[50vh]" />;
  }

  if (!branchId) {
    return (
      <BranchPicker
        onSelect={(branch) => {
          setBranch(branch.id);
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-16 pt-10">
      <BrandLogo className="h-20 sm:h-24" priority />
      <h1 className="mt-6 text-center text-2xl font-bold text-white sm:text-3xl">¿Cómo quieres tu pedido?</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {branchById(branchId).shortName}. Elige una opción para ver el menú.
      </p>
      <button type="button" className="mt-2 text-sm font-semibold text-brand-500 hover:underline" onClick={clearBranch}>
        Cambiar sucursal
      </button>

      <div className="mt-8 grid w-full grid-cols-2 items-stretch gap-3 sm:gap-4">
        <FulfillmentChoice
          icon={Bike}
          label="Entrega a domicilio"
          closed={!open.isOpen}
          onChoose={() => choose('delivery')}
        />
        <FulfillmentChoice
          icon={Store}
          label="Recoger en tienda"
          closed={!open.isOpen}
          onChoose={() => choose('pickup')}
        />
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
