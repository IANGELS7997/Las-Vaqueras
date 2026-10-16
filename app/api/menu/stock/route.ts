import { NextResponse } from 'next/server';
import { isBranchId } from '@/lib/branches';
import { blockedIds } from '@/lib/branch-stock';
import { listOutOfStock } from '@/lib/branch-stock-db';

export const runtime = 'nodejs';

/** El CDN comparte esta respuesta entre clientes de la misma sucursal. */
const STOCK_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=30';

function stockResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': status === 200 ? STOCK_CACHE_CONTROL : 'no-store',
    },
  });
}

export async function GET(req: Request) {
  const branch = new URL(req.url).searchParams.get('branch');
  if (!isBranchId(branch)) {
    return stockResponse({ error: 'Sucursal no válida' }, 400);
  }
  try {
    const outOfStockIds = await listOutOfStock(branch);
    return stockResponse({ outOfStockIds: Array.from(blockedIds(outOfStockIds)) }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer el inventario';
    return stockResponse({ error: message }, 500);
  }
}
