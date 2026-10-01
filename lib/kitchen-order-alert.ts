import { branchById, orderBranchId } from '@/lib/branches';
import {
  sendKitchenOfflineAlert,
  shouldSendOrderOfflineAlert,
  type KitchenStationRow,
} from '@/lib/kitchen-station';
import type { createAdminSupabase } from '@/lib/supabase-admin';

type Client = ReturnType<typeof createAdminSupabase>;

/** Si un pedido se paga y la caja de su sucursal no está lista, avisa a Angel y a Adrian. */
export async function alertIfKitchenOfflineForOrder(
  supabase: Client,
  order: { id: string; short_code?: string | null; branch_id?: string | null }
) {
  const branch = branchById(orderBranchId(order.branch_id));
  const { data } = await supabase
    .from('kitchen_station')
    .select('*')
    .eq('id', branch.stationId)
    .maybeSingle();

  const row = (data || null) as KitchenStationRow | null;
  if (!shouldSendOrderOfflineAlert(row)) return { sent: false };

  const alert = await sendKitchenOfflineAlert({
    reason: 'order_while_offline',
    orderId: order.id,
    shortCode: order.short_code || null,
    branchId: branch.id,
  });

  if (alert.sent) {
    const now = new Date().toISOString();
    await supabase
      .from('kitchen_station')
      .update({ order_alert_sent_at: now, updated_at: now })
      .eq('id', branch.stationId);
  }

  return alert;
}
