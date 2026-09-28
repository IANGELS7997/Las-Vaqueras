import { sendArrivalEmail, shouldSendArrivalEmail } from '@/lib/arrival-email';
import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { closeIangelOpsOrder, type IangelOpsRow } from '@/lib/iangel-ops';
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
    if (
      shouldSendArrivalEmail({
        action: String(body.action || ''),
        previousDispatch: typeof row.dispatch_status === 'string' ? row.dispatch_status : null,
        fulfillment: typeof row.fulfillment_type === 'string' ? row.fulfillment_type : null,
        email: typeof row.customer_email === 'string' ? row.customer_email : null,
      })
    ) {
      try {
        await sendArrivalEmail({
          to: String(row.customer_email || ''),
          customerName: String(row.customer_name || ''),
          orderId: params.id,
          token: typeof row.profile_login_token === 'string' ? row.profile_login_token : null,
          leaveAtDoor: Boolean(row.leave_at_door),
        });
      } catch {
        // La llegada ya quedó guardada. El correo no debe frenar al rider.
      }
    }
    if (customerText) {
      await supabase.from('order_messages').insert({
        order_id: params.id,
        actor: 'system',
        kind: 'system',
        body: customerText,
      });
    }
    if (String(body.action || '') === 'deliver') {
      void closeIangelOpsOrder(updated.data as IangelOpsRow, 'delivered').catch(() => undefined);
    }
    return iangelJson(req, { ok: true, order: mapIangelOrder(updated.data as Record<string, unknown>) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar';
    return iangelJson(req, { error: message }, 400);
  }
}
