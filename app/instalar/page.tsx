import { PwaInstallHint } from '@/components/pwa-install-hint';

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
