import { NextResponse } from 'next/server';
import { opsWebhookAuthorized } from '@/lib/ops-webhook';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!opsWebhookAuthorized(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const supabase = createAdminSupabase();
  const found = await supabase
    .from('orders')
    .select('id, short_code, customer_name, customer_email, branch_id, status, created_at, handoff_pin')
    .eq('delivery_provider', 'managed')
    .neq('status', 'delivered')
    .neq('status', 'cancelled')
    .neq('status', 'awaiting_payment')
    .order('created_at', { ascending: false })
    .limit(40);
  if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });
  return NextResponse.json({
    orders: (found.data || []).map((row) => ({
      id: row.id,
      code: row.short_code || String(row.id).replace(/-/g, '').slice(0, 4).toUpperCase(),
      customerName: row.customer_name,
      email: row.customer_email,
      branchId: row.branch_id,
      status: row.status,
      createdAt: row.created_at,
      pin: row.handoff_pin || '',
    })),
  });
}
