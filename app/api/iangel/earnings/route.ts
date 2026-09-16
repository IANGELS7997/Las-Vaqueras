import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { SELF_FEE_MXN } from '@/lib/iangel-constants';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('orders')
    .select('id, short_code, delivery_fee, self_fee, status, created_at')
    .in('delivery_provider', ['self', 'wait_self'])
    .in('status', ['delivered', 'delivered_unclaimed'])
    .gte('created_at', start.toISOString());
  const trips = data || [];
  const earnings = trips.length * SELF_FEE_MXN;
  return iangelJson(req, { trips: trips.length, earnings, fee: SELF_FEE_MXN, orders: trips });
}
