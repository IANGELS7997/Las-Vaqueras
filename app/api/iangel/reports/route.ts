import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { HELP_LABELS, isHelpKind, isOpenCustomerRefund, REFUND_REVIEW_LABEL } from '@/lib/rider-help';
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
  const columns =
    'id, order_id, rider_key, kind, phase, pay_method, food_mxn, rider_due_mxn, note, customer_note, payout_code, payout_paid_at, resolution, refund_credit_mxn, created_at';
  const found = await supabase
    .from('rider_help_reports')
    .select(columns)
    .eq('rider_key', riderKey)
    .order('created_at', { ascending: false })
    .limit(40);
  if (found.error) return iangelJson(req, { error: found.error.message }, 500);
  const rows = found.data || [];
  if (riderKey === ANGEL_RIDER_KEY) {
    const customerRefunds = await supabase
      .from('rider_help_reports')
      .select(columns)
      .eq('kind', 'incomplete')
      .order('created_at', { ascending: false })
      .limit(40);
    if (customerRefunds.error) return iangelJson(req, { error: customerRefunds.error.message }, 500);
    const seen = new Set(rows.map((row) => row.id));
    for (const row of customerRefunds.data || []) {
      if (seen.has(row.id) || !isOpenCustomerRefund(row)) continue;
      rows.push(row);
      seen.add(row.id);
    }
  }
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
      const openRefund = isOpenCustomerRefund(row);
      const status = paid ? 'Pagado en caja' : resolution === 'rejected' ? 'Rechazado' : resolution === 'approved' || resolution === 'credit' ? 'Aprobado' : 'Pendiente';
      return {
        id: row.id,
        orderId: row.order_id,
        orderCode: codes.get(String(row.order_id)) || null,
        label: openRefund ? REFUND_REVIEW_LABEL : isHelpKind(kind) ? HELP_LABELS[kind] : kind,
        status,
        code: row.payout_code || null,
        amount: Number(row.rider_due_mxn || 0),
        note: row.note || '',
        createdAt: row.created_at,
      };
    }),
  });
}
