import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { mapIangelOrder, runIangelOrderAction } from '@/lib/iangel-order';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { action?: string; pin?: string };
  const supabase = createAdminSupabase();
  const found = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!found.data) return iangelJson(req, { error: 'Pedido no encontrado' }, 404);
  const row = found.data as Record<string, unknown>;

  try {
    const { patch, customerText } = await runIangelOrderAction(row, String(body.action || ''), body.pin);
    if (String(body.action || '') === 'deliver') {
      patch.status = 'delivered';
      patch.dispatch_status = 'delivered';
      patch.rider_status = 'idle';
    }
    if (!row.short_code) {
      patch.short_code = String(row.id).replace(/-/g, '').slice(0, 4).toUpperCase();
    }
    const updated = await supabase.from('orders').update(patch).eq('id', params.id).select('*').single();
    if (updated.error) throw new Error(updated.error.message);
    if (customerText) {
      await supabase.from('order_messages').insert({
        order_id: params.id,
        actor: 'system',
        kind: 'system',
        body: customerText,
      });
    }
    return iangelJson(req, { ok: true, order: mapIangelOrder(updated.data as Record<string, unknown>) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar';
    return iangelJson(req, { error: message }, 400);
  }
}
