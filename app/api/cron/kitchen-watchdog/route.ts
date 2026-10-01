import { NextResponse } from 'next/server';
import { BRANCHES } from '@/lib/branches';
import {
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
  const nowMs = Date.now();
  const alerts: string[] = [];

  for (const branch of BRANCHES) {
    const { data } = await supabase.from('kitchen_station').select('*').eq('id', branch.stationId).maybeSingle();
    const row = (data || null) as KitchenStationRow | null;
    if (isKitchenStationOnline(row, nowMs) || !row?.shift_active) continue;
    if (!shouldSendOfflineAlert(row, nowMs)) continue;
    const alert = await sendKitchenOfflineAlert({ reason: 'stale', branchId: branch.id });
    if (!alert.sent) continue;
    alerts.push(branch.id);
    const now = new Date().toISOString();
    await supabase
      .from('kitchen_station')
      .update({ offline_alert_sent_at: now, updated_at: now })
      .eq('id', branch.stationId);
  }

  return NextResponse.json({ ok: true, alerted: alerts });
}
