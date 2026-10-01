import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ICONS = [
  { src: '/logo-vaqueras.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
  { src: '/logo-vaqueras.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
];

function entryPath(pedido: string, secret: string) {
  const safeId = /^[0-9a-f-]{8,80}$/i.test(pedido);
  const safeToken = /^[0-9a-f]{16,64}$/i.test(secret);
  if (!safeId || !safeToken) return '/';
  return `/?pedido=${encodeURIComponent(pedido)}&s=${encodeURIComponent(secret)}`;
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const start = entryPath(url.searchParams.get('pedido') || '', url.searchParams.get('s') || '');
  return NextResponse.json(
    {
      name: 'Las Vaqueras',
      short_name: 'Vaqueras',
      description: 'Pide Papas Vaqueras, Boneless y Hamburguesas a domicilio en Chihuahua.',
      start_url: start,
      scope: '/',
      display: 'standalone',
      background_color: '#0a0a0a',
      theme_color: '#f97316',
      lang: 'es-MX',
      icons: ICONS,
    },
    { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } }
  );
}
