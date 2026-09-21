import {
  KITCHEN_STATION_ID,
  sendKitchenOfflineAlert,
  shouldSendOrderOfflineAlert,
  type KitchenStationRow,
} from '@/lib/kitchen-station';
import type { createAdminSupabase } from '@/lib/supabase-admin';

type Client = ReturnType<typeof createAdminSupabase>;

/** Si un pedido se paga y cocina no está lista, avisa a Angel y al dueño. */
export async function alertIfKitchenOfflineForOrder(
  supabase: Client,
  order: { id: string; short_code?: string | null }
) {
  const { data } = await supabase
    .from('kitchen_station')
    .select('*')
    .eq('id', KITCHEN_STATION_ID)
    .maybeSingle();

  const row = (data || null) as KitchenStationRow | null;
  if (!shouldSendOrderOfflineAlert(row)) return { sent: false };

  const alert = await sendKitchenOfflineAlert({
    reason: 'order_while_offline',
    orderId: order.id,
    shortCode: order.short_code || null,
  });

  if (alert.sent) {
    const now = new Date().toISOString();
    await supabase
      .from('kitchen_station')
      .update({ order_alert_sent_at: now, updated_at: now })
      .eq('id', KITCHEN_STATION_ID);
  }

  return alert;
}
