import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const { data, error } = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (error) return iangelJson(req, { error: error.message }, 500);
  if (!data) return iangelJson(req, { error: 'Pedido no encontrado' }, 404);
  return iangelJson(req, { order: mapDbOrder(data as DbOrderRow) });
}
