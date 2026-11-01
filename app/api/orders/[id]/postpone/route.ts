import { NextResponse } from 'next/server';
import { orderBranchId } from '@/lib/branches';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { sendPostponeEmails } from '@/lib/postpone-email';
import { isPostponeMinutes } from '@/lib/postpone';
import type { PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;

  const body = (await req.json().catch(() => ({}))) as { minutes?: number };
  const minutes = Math.round(Number(body.minutes));
  if (!isPostponeMinutes(minutes)) {
    return NextResponse.json({ error: 'Elige 5, 10, 15 o 20 minutos' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!current.data || orderBranchId(current.data.branch_id) !== branch) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }
  if (current.data.status === 'delivered' || current.data.status === 'cancelled' || current.data.status === 'awaiting_payment') {
    return NextResponse.json({ error: 'Este pedido ya no se puede posponer' }, { status: 400 });
  }

  const saved = await supabase
    .from('orders')
    .update({ prep_delay_minutes: minutes })
    .eq('id', params.id)
    .select('*')
    .single();
  if (saved.error || !saved.data) {
    return NextResponse.json({ error: saved.error?.message || 'No se guardó el retraso' }, { status: 500 });
  }

  const mailed = await sendPostponeEmails(saved.data as PurchaseNoticeRow, minutes);
  if (!mailed.developerOk) {
    return NextResponse.json({ error: 'Se guardó el retraso, pero no salió el correo interno' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    minutes,
    order: mapDbOrder(saved.data as DbOrderRow, { includeHandoffPin: true }),
  });
}
