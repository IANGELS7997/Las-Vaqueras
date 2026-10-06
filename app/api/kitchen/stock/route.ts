import { NextResponse } from 'next/server';
import { isStockItemId, stockRows } from '@/lib/branch-stock';
import { listOutOfStock, setOutOfStock } from '@/lib/branch-stock-db';
import { requireKitchenBranch } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';

export async function GET() {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;
  try {
    const outOfStockIds = await listOutOfStock(branch);
    return NextResponse.json({ outOfStockIds, rows: stockRows() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo leer el inventario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;
  const body = (await req.json().catch(() => null)) as { itemId?: string; outOfStock?: boolean } | null;
  const itemId = String(body?.itemId || '').trim();
  if (!isStockItemId(itemId) || typeof body?.outOfStock !== 'boolean') {
    return NextResponse.json({ error: 'Artículo no válido' }, { status: 400 });
  }
  try {
    await setOutOfStock(branch, itemId, body.outOfStock);
    return NextResponse.json({ ok: true, outOfStockIds: await listOutOfStock(branch) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
