'use client';

import { useEffect, useState } from 'react';

/** Si la consulta falla, se queda el horario. No cierra la tienda por un fallo de red. */
export function useManualClosure() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      try {
        const response = await fetch('/api/store-status', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!cancel && response.ok) setClosed(payload.closed === true);
      } catch {
        /* el horario sigue mandando */
      }
    }
    void load();
    const timer = window.setInterval(load, 30000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, []);

  return closed;
}
