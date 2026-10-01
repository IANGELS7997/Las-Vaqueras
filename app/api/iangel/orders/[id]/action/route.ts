import * as Sentry from '@sentry/nextjs';
import { sendArrivalEmail, shouldSendArrivalEmail } from '@/lib/arrival-email';
import { notifyNextDoorEnroute } from '@/lib/enroute-email';
import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { mapIangelOrder, runIangelOrderAction } from '@/lib/iangel-order';
import { doorCollectAmounts } from '@/lib/iangel-cash';
import { markIangelDoorCollected, type IangelOpsRow } from '@/lib/iangel-ops';
import { closeDeliveredWithFee } from '@/lib/iangel-rider-fee';
import { getRiderPresence } from '@/lib/iangel-presence';
import { isHouseIangelRow, saveOrderProof } from '@/lib/order-proof';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pin?: string;
    hasDoorPhoto?: boolean;
    photo?: string;
  };
  const supabase = createAdminSupabase();
  const found = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!found.data) return iangelJson(req, { error: 'Pedido no encontrado' }, 404);
  const row = found.data as Record<string, unknown>;

  try {
    const owner = String(row.iangel_rider_key || '').trim();
    if (owner && owner !== riderKey) {
      return iangelJson(req, { error: 'Este pedido lo lleva el otro rider' }, 409);
    }
    const actionName = String(body.action || '');
    if (actionName === 'incident') {
      return iangelJson(req, { error: 'Usa Ayuda para reportar. El viaje no se cierra desde aquí.' }, 400);
    }
    if ((actionName === 'pickup_photo' || actionName === 'dropoff_photo') && typeof body.photo !== 'string') {
      return iangelJson(req, { error: 'Toma la foto antes de continuar.' }, 400);
    }
    if (
      (actionName === 'pickup_photo' || actionName === 'dropoff_photo' || (actionName === 'deliver' && body.photo)) &&
      typeof body.photo === 'string'
    ) {
      if (!isHouseIangelRow(row)) {
        return iangelJson(req, { error: 'Este pedido no usa la foto de IANGEL' }, 400);
      }
      const kind = actionName === 'pickup_photo' ? 'pickup' : 'dropoff';
      const proof = await saveOrderProof(supabase, params.id, kind, body.photo);
      Object.assign(row, proof);
      const savedProof = await supabase.from('orders').update(proof).eq('id', params.id).select('*').maybeSingle();
      if (savedProof.error) throw new Error(savedProof.error.message);
      if (savedProof.data) Object.assign(row, savedProof.data);
      if (actionName === 'pickup_photo' || actionName === 'dropoff_photo') {
        return iangelJson(req, { ok: true, order: mapIangelOrder(row) });
      }
    }
    if (isHouseIangelRow(row) && (actionName === 'pickup' || actionName === 'en_route') && !row.kitchen_released_at) {
      return iangelJson(req, { error: 'Cocina todavía no entrega el pedido.' }, 400);
    }
    if (isHouseIangelRow(row) && actionName === 'deliver' && !row.dropoff_photo_at) {
      return iangelJson(req, { error: 'Toma la foto en el domicilio antes de cerrar el viaje.' }, 400);
    }
    const presence = await getRiderPresence(riderKey);
    const locked = String((presence as { help_lock_note?: string | null }).help_lock_note || '').trim();
    const claim = !owner && actionName !== 'paid_cash';
    if (claim && locked) return iangelJson(req, { error: locked }, 409);
    const { patch, customerText } = await runIangelOrderAction(row, actionName, body.pin, riderKey);
    if (claim) patch.iangel_rider_key = riderKey;
    if (actionName === 'deliver') {
      patch.status = 'delivered';
      patch.dispatch_status = 'delivered';
      patch.rider_status = 'idle';
      if (row.leave_at_door === true) patch.door_photo_at = new Date().toISOString();
    }
    if (!row.short_code) {
      patch.short_code = String(row.id).replace(/-/g, '').slice(0, 4).toUpperCase();
    }
    let update = supabase.from('orders').update(patch).eq('id', params.id);
    if (claim) update = update.is('iangel_rider_key', null);
    const updated = await update.select('*').maybeSingle();
    if (updated.error) throw new Error(updated.error.message);
    if (!updated.data) {
      return iangelJson(req, { error: 'Este pedido lo lleva el otro rider' }, 409);
    }
    if (
      shouldSendArrivalEmail({
        action: actionName,
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
          branchId: row.branch_id,
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    }
    if (actionName === 'pickup' || actionName === 'en_route' || actionName === 'deliver') {
      await notifyNextDoorEnroute(supabase);
    }
    if (customerText) {
      await supabase.from('order_messages').insert({
        order_id: params.id,
        actor: 'system',
        kind: 'system',
        body: customerText,
      });
    }
    if (actionName === 'deliver' || (actionName === 'finish_report' && updated.data.status === 'delivered')) {
      void closeDeliveredWithFee(updated.data as Record<string, unknown>).catch(() => undefined);
    }
    if (actionName === 'collect_door') {
      const saved = updated.data as Record<string, unknown>;
      const amounts = doorCollectAmounts(Number(saved.cash_food_due));
      void markIangelDoorCollected(saved as IangelOpsRow, {
        paymentStatus: 'cobrado',
        paymentNote: amounts.note,
        cashFoodDue: amounts.comida,
      }).catch((err) => Sentry.captureException(err));
    }
    return iangelJson(req, { ok: true, order: mapIangelOrder(updated.data as Record<string, unknown>) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar';
    return iangelJson(req, { error: message }, 400);
  }
}
