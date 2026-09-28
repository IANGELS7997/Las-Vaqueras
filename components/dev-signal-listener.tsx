'use client';

import { useEffect } from 'react';
import { deviceLabel, installDeadClickWatch, isKitchenSurface, markVisitSent, postDevSignal } from '@/lib/dev-signal-client';

export function DevSignalListener() {
  useEffect(() => {
    if (isKitchenSurface()) return;
    if (markVisitSent()) {
      const when = new Date().toLocaleString('es-MX', {
        timeZone: 'America/Chihuahua',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      postDevSignal({
        type: 'visit',
        message: when,
        device: deviceLabel(),
        action: 'entrada',
      });
    }
    return installDeadClickWatch();
  }, []);

  return null;
}
