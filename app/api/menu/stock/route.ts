import { NextResponse } from 'next/server';
import { isBranchId } from '@/lib/branches';
import { blockedIds } from '@/lib/branch-stock';
import { listOutOfStock } from '@/lib/branch-stock-db';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const branch = new URL(req.url).searchParams.get('branch');
  if (!isBranchId(branch)) {
    return NextResponse.json({ error: 'Sucursal no válida' }, { status: 400 });
  }
  try {
    const outOfStockIds = await listOutOfStock(branch);
    return NextResponse.json({ outOfStockIds: Array.from(blockedIds(outOfStockIds)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer el inventario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
