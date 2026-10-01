'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'lv-pwa-reload';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;

    const reloadInstallPage = () => {
      if (cancelled) return;
      if (window.location.pathname !== '/instalar') return;
      if (navigator.serviceWorker.controller) return;
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    };

    void navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (navigator.serviceWorker.controller) return;
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker || worker.state === 'activated') {
        reloadInstallPage();
        return;
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') reloadInstallPage();
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
