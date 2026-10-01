import { NextResponse } from 'next/server';
import { orderBranchId } from '@/lib/branches';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { payHelpAtRegister } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;
  const body = (await req.json().catch(() => ({}))) as { orderId?: string; code?: string };
  const orderId = String(body.orderId || '').trim();
  const code = String(body.code || '').trim();
  if (!orderId || !code) return NextResponse.json({ error: 'Faltan el pedido y el código' }, { status: 400 });
  const owned = await createAdminSupabase().from('orders').select('branch_id').eq('id', orderId).maybeSingle();
  if (!owned.data || orderBranchId(owned.data.branch_id) !== branch) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }
  try {
    const paid = await payHelpAtRegister(createAdminSupabase(), orderId, code);
    return NextResponse.json(paid);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo pagar';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
