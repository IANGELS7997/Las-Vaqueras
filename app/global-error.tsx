'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-neutral-950 text-white p-8">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-neutral-400">
          El equipo ya fue notificado. Intenta recargar la página.
        </p>
      </body>
    </html>
  );
}
