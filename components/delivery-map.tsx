'use client';

import { useEffect, useRef } from 'react';
import { CHIHUAHUA_CENTER } from '@/lib/delivery-address';
import { loadLeaflet, type LeafletMap, type LeafletMarker } from '@/lib/leaflet';

type DeliveryMapProps = {
  lat: number | null;
  lng: number | null;
  disabled?: boolean;
  onPick: (lat: number, lng: number) => void;
};

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
      <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm font-semibold leading-snug text-brand-400">
        Toca el mapa para marcar el punto exacto de entrega. El repartidor usa esa ubicación.
      </p>
    </div>
  );
}
