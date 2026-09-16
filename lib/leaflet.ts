export type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void;
  remove: () => void;
  fitBounds: (b: [[number, number], [number, number]], o?: { padding: [number, number] }) => void;
};

export type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
};

export type LeafletNamespace = {
  map: (el: HTMLElement, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (
    url: string,
    options: { attribution: string; maxZoom: number }
  ) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number]) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

let leafletLoader: Promise<LeafletNamespace> | null = null;

export function loadLeaflet(): Promise<LeafletNamespace> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
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
