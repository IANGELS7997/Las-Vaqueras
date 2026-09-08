'use client';

import { useEffect, useRef } from 'react';
import { CHIHUAHUA_CENTER } from '@/lib/delivery-address';

type DeliveryMapProps = {
  lat: number | null;
  lng: number | null;
  disabled?: boolean;
  onPick: (lat: number, lng: number) => void;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    void loadLeaflet()
      .then((L) => {
        if (cancelled || !el) return;
        const map = L.map(el, { zoomControl: true }).setView(
          [lat ?? CHIHUAHUA_CENTER.lat, lng ?? CHIHUAHUA_CENTER.lng],
          lat && lng ? 16 : 13
        );
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        map.on('click', (event) => {
          if (disabled) return;
          onPickRef.current(event.latlng.lat, event.latlng.lng);
        });
        mapRef.current = map;
        if (lat && lng) {
          markerRef.current = L.marker([lat, lng]).addTo(map);
        }
      })
      .catch(() => {
        // El formulario de dirección sigue funcionando sin mapa
      });

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
    map.setView([lat, lng], 16);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }
  }, [lat, lng]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-border/60 bg-secondary/40"
      />
      <p className="text-xs text-muted-foreground">
        Toca el mapa para marcar el punto exacto de entrega. El repartidor usa esa ubicación.
      </p>
    </div>
  );
}
