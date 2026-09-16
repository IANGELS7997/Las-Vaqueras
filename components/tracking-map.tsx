'use client';

import { useEffect, useRef } from 'react';
import { RESTAURANT_INFO } from '@/lib/restaurant';
import { loadLeaflet, type LeafletMap } from '@/lib/leaflet';

type TrackingMapProps = {
  dropLat: number | null;
  dropLng: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
};

export function TrackingMap({ dropLat, dropLng, riderLat, riderLng }: TrackingMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || dropLat == null || dropLng == null) return;
    let cancelled = false;
    void loadLeaflet()
      .then((L) => {
        if (cancelled || !el) return;
        const map = L.map(el).setView([dropLat, dropLng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        L.marker([dropLat, dropLng]).addTo(map);
        L.marker([RESTAURANT_INFO.pickupLat, RESTAURANT_INFO.pickupLng]).addTo(map);
        if (riderLat != null && riderLng != null) {
          L.marker([riderLat, riderLng]).addTo(map);
          map.fitBounds(
            [
              [dropLat, dropLng],
              [riderLat, riderLng],
            ],
            { padding: [24, 24] }
          );
        }
        mapRef.current = map;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [dropLat, dropLng, riderLat, riderLng]);

  if (dropLat == null || dropLng == null) return null;
  return <div ref={ref} className="h-56 w-full overflow-hidden rounded-[20px] border border-[var(--ia-line)]" />;
}
