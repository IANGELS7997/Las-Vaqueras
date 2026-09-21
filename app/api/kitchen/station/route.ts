import { NextResponse } from 'next/server';
import {
  KITCHEN_STATION_ID,
  sendKitchenOfflineAlert,
  shouldSendOfflineAlert,
  viewKitchenStation,
  type KitchenStationRow,
} from '@/lib/kitchen-station';
import { requireKitchenSession } from '@/lib/kitchen-guard';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadStation(supabase: ReturnType<typeof createAdminSupabase>) {
  const { data } = await supabase
    .from('kitchen_station')
    .select('*')
    .eq('id', KITCHEN_STATION_ID)
    .maybeSingle();
  return (data || null) as KitchenStationRow | null;
}

export async function GET() {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  const supabase = createAdminSupabase();
  const row = await loadStation(supabase);
  return NextResponse.json(
    { station: viewKitchenStation(row) },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(req: Request) {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    shiftActive?: boolean;
    autoPrint?: boolean;
    event?: 'heartbeat' | 'print' | 'close';
  };

  const supabase = createAdminSupabase();
  const now = new Date().toISOString();
  const event = body.event || 'heartbeat';
  const shiftActive = event === 'close' ? false : Boolean(body.shiftActive);
  const autoPrint = event === 'close' ? false : Boolean(body.autoPrint);

  const patch: Record<string, unknown> = {
    shift_active: shiftActive,
    auto_print: autoPrint,
    updated_at: now,
  };

  if (event === 'close') {
    patch.closed_at = now;
  } else {
    patch.last_seen_at = now;
    patch.closed_at = null;
  }

  if (event === 'print') {
    patch.last_print_at = now;
  }

  const saved = await supabase
    .from('kitchen_station')
    .upsert({ id: KITCHEN_STATION_ID, ...patch }, { onConflict: 'id' })
    .select('*')
    .single();

  if (saved.error) {
    return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  const row = saved.data as KitchenStationRow;

  if (event === 'close' && shouldSendOfflineAlert(row)) {
    const alert = await sendKitchenOfflineAlert({ reason: 'closed' });
    if (alert.sent) {
      await supabase
        .from('kitchen_station')
        .update({ offline_alert_sent_at: now, updated_at: now })
        .eq('id', KITCHEN_STATION_ID);
    }
  }

  return NextResponse.json({ station: viewKitchenStation(row as KitchenStationRow) });
}
