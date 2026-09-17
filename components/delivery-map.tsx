'use client';

import { useEffect, useRef, useState } from 'react';
import { CHIHUAHUA_CENTER } from '@/lib/delivery-address';
import { Button } from '@/components/ui/button';

type DeliveryMapProps = {
  lat: number | null;
  lng: number | null;
  disabled?: boolean;
  onPick: (lat: number, lng: number) => void;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (e?: { latlng?: { lat: number; lng: number } }) => void) => void;
  getCenter: () => { lat: number; lng: number };
  invalidateSize?: () => void;
  remove: () => void;
};

type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
};

type LeafletNamespace = {
  map: (el: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (url: string, options: { attribution: string; maxZoom: number }) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number]) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const RIDER_PIN_COPY =
  'El punto marcado por la cruz es la ubicación que utiliza el rider para la entrega. Mueve el mapa hasta que la cruz quede sobre la puerta de tu casa, no sobre la calle, y pulsa Confirmar punto de entrega. Si el punto no coincide con tu domicilio, el pedido puede entregarse en otro lugar.';

let leafletLoader: Promise<LeafletNamespace> | null = null;

function loadLeaflet(): Promise<LeafletNamespace> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletLoader) return leafletLoader;

  leafletLoader = new Promise((resolve, reject) => {
    const cssId = 'lv-leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error('Leaflet no cargó'));
    };
    script.onerror = () => reject(new Error('No se pudo cargar el mapa'));
    document.body.appendChild(script);
  });

  return leafletLoader;
}

export function DeliveryMap({ lat, lng, disabled, onPick }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [geoError, setGeoError] = useState('');

  function centerOn(nextLat: number, nextLng: number, zoom = 18) {
    mapRef.current?.setView([nextLat, nextLng], zoom);
  }

  function useMyLocation() {
    if (disabled || !navigator.geolocation) {
      setGeoError('Activa la ubicación en el celular para acercar el mapa.');
      return;
    }
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => centerOn(pos.coords.latitude, pos.coords.longitude, 18),
      () => setGeoError('No se pudo leer tu ubicación. Mueve el mapa hasta tu puerta.'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function confirmDoor() {
    const map = mapRef.current;
    if (!map || disabled) return;
    const center = map.getCenter();
    onPickRef.current(center.lat, center.lng);
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    void loadLeaflet()
      .then((L) => {
        if (cancelled || !el) return;
        const startLat = lat ?? CHIHUAHUA_CENTER.lat;
        const startLng = lng ?? CHIHUAHUA_CENTER.lng;
        const map = L.map(el, { zoomControl: true }).setView([startLat, startLng], lat && lng ? 18 : 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
        window.setTimeout(() => map.invalidateSize?.(), 80);
        if (lat && lng) {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
        if (!lat && !lng && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              centerOn(pos.coords.latitude, pos.coords.longitude, 18);
            },
            () => undefined,
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [disabled]);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || lat == null || lng == null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  }, [lat, lng]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[min(45vh,360px)] min-h-[320px] w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40"
        />
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          <span className="relative block h-10 w-10">
            <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-brand-400 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-brand-400 shadow-[0_0_0_1px_rgba(0,0,0,0.35)]" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-500" />
          </span>
        </div>
      </div>
      <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-3 text-sm font-medium leading-relaxed text-brand-400">
        {RIDER_PIN_COPY}
      </p>
      {geoError ? <p className="text-sm text-red-400">{geoError}</p> : null}
      <div className="flex w-full flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-12 w-full rounded-xl px-4 text-sm font-semibold touch-manipulation sm:text-base"
          disabled={disabled}
          onClick={useMyLocation}
        >
          Usar mi ubicación
        </Button>
        <Button
          type="button"
          className="h-12 w-full rounded-xl px-4 text-sm font-bold touch-manipulation sm:text-base"
          disabled={disabled}
          onClick={confirmDoor}
        >
          Confirmar punto de entrega
        </Button>
      </div>
      {lat != null && lng != null ? (
        <p className="text-xs font-semibold text-emerald-400">Punto de entrega confirmado. El rider llega aquí.</p>
      ) : (
        <p className="text-xs text-muted-foreground">Confirma el punto de entrega para continuar el pedido.</p>
      )}
    </div>
  );
}
