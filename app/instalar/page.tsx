import type { Metadata } from 'next';
import { PwaInstallHint } from '@/components/pwa-install-hint';

type InstallQuery = { pedido?: string; s?: string };

function manifestHref(query: InstallQuery) {
  const pedido = typeof query.pedido === 'string' ? query.pedido : '';
  const secret = typeof query.s === 'string' ? query.s : '';
  const safeId = /^[0-9a-f-]{8,80}$/i.test(pedido);
  const safeToken = /^[0-9a-f]{16,64}$/i.test(secret);
  if (!safeId || !safeToken) return '/manifest.webmanifest';
  return `/api/pwa-manifest?pedido=${encodeURIComponent(pedido)}&s=${encodeURIComponent(secret)}`;
}

export function generateMetadata({ searchParams }: { searchParams: InstallQuery }): Metadata {
  return { manifest: manifestHref(searchParams) };
}

export default function InstalarPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center text-white">
      <h1 className="text-2xl font-bold text-orange-500">Agregar app al inicio</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Las Vaqueras se abre como app para pedir y seguir tu pedido.
      </p>
      <PwaInstallHint autoPrompt />
    </div>
  );
}
