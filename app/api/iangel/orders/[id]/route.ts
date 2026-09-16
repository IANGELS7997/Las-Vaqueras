import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { mapIangelOrder } from '@/lib/iangel-order';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const found = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!found.data) return iangelJson(req, { error: 'Pedido no encontrado' }, 404);
  return iangelJson(req, { order: mapIangelOrder(found.data as Record<string, unknown>) });
}
