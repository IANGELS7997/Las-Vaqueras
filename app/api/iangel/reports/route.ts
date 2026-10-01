import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { HELP_LABELS, isHelpKind } from '@/lib/rider-help';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const supabase = createAdminSupabase();
  const found = await supabase
    .from('rider_help_reports')
    .select('id, order_id, kind, phase, pay_method, food_mxn, rider_due_mxn, note, payout_code, payout_paid_at, resolution, created_at')
    .eq('rider_key', riderKey)
    .order('created_at', { ascending: false })
    .limit(40);
  if (found.error) return iangelJson(req, { error: found.error.message }, 500);
  const rows = found.data || [];
  const orderIds = Array.from(new Set(rows.map((row) => String(row.order_id || '')).filter(Boolean)));
  const codes = new Map<string, string>();
  if (orderIds.length > 0) {
    const orders = await supabase.from('orders').select('id, short_code').in('id', orderIds);
    for (const order of orders.data || []) {
      codes.set(String(order.id), String(order.short_code || '').toUpperCase());
    }
  }
  return iangelJson(req, {
    reports: rows.map((row) => {
      const kind = String(row.kind || '');
      const resolution = String(row.resolution || '');
      const paid = Boolean(row.payout_paid_at);
      const status = paid ? 'Pagado en caja' : resolution === 'rejected' ? 'Rechazado' : resolution === 'approved' ? 'Aprobado' : 'Pendiente';
      return {
        id: row.id,
        orderId: row.order_id,
        orderCode: codes.get(String(row.order_id)) || null,
        label: isHelpKind(kind) ? HELP_LABELS[kind] : kind,
        status,
        code: row.payout_code || null,
        amount: Number(row.rider_due_mxn || 0),
        note: row.note || '',
        createdAt: row.created_at,
      };
    }),
  });
}
