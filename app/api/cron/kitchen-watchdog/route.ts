import { NextResponse } from 'next/server';
import {
  KITCHEN_STATION_ID,
  isKitchenStationOnline,
  sendKitchenOfflineAlert,
  shouldSendOfflineAlert,
  type KitchenStationRow,
} from '@/lib/kitchen-station';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cron: detecta pestaña de cocina caída aunque no haya beacon de cierre. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') || '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  } else if (process.env.VERCEL && !isVercelCron) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('kitchen_station')
    .select('*')
    .eq('id', KITCHEN_STATION_ID)
    .maybeSingle();

  const row = (data || null) as KitchenStationRow | null;
  const nowMs = Date.now();
  const online = isKitchenStationOnline(row, nowMs);

  if (online || !row?.shift_active) {
    return NextResponse.json({ ok: true, online, alerted: false });
  }

  if (!shouldSendOfflineAlert(row, nowMs)) {
    return NextResponse.json({ ok: true, online: false, alerted: false, cooledDown: true });
  }

  const alert = await sendKitchenOfflineAlert({ reason: 'stale' });
  if (alert.sent) {
    const now = new Date().toISOString();
    await supabase
      .from('kitchen_station')
      .update({
        shift_active: false,
        auto_print: false,
        offline_alert_sent_at: now,
        updated_at: now,
      })
      .eq('id', KITCHEN_STATION_ID);
  }

  return NextResponse.json({ ok: true, online: false, alerted: alert.sent });
}
