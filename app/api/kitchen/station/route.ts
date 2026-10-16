import { NextResponse } from 'next/server';
import { branchById } from '@/lib/branches';
import {
  sendKitchenShiftNotice,
  shiftNoticeKind,
  viewKitchenStation,
  type KitchenStationRow,
} from '@/lib/kitchen-station';
import { kitchenCookieOptions, kitchenSessionToken, KITCHEN_COOKIE } from '@/lib/kitchen-auth';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { notifyKitchenWatch } from '@/lib/iangel-ops';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function loadStation(supabase: ReturnType<typeof createAdminSupabase>, stationId: string) {
  const { data } = await supabase.from('kitchen_station').select('*').eq('id', stationId).maybeSingle();
  return (data || null) as KitchenStationRow | null;
}

export async function GET() {
  const branchId = await requireKitchenBranch();
  if (branchId instanceof NextResponse) return branchId;
  const branch = branchById(branchId);

  const supabase = createAdminSupabase();
  const row = await loadStation(supabase, branch.stationId);
  return NextResponse.json(
    { station: viewKitchenStation(row), branchName: branch.shortName, branchId: branch.id },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}

export async function POST(req: Request) {
  const branchId = await requireKitchenBranch();
  if (branchId instanceof NextResponse) return branchId;
  const branch = branchById(branchId);

  const body = (await req.json().catch(() => ({}))) as {
    shiftActive?: boolean;
    autoPrint?: boolean;
    event?: 'heartbeat' | 'print' | 'close' | 'end_shift';
  };

  const supabase = createAdminSupabase();
  const previous = await loadStation(supabase, branch.stationId);
  if (previous?.admin_enabled === false) {
    return NextResponse.json({ error: 'Cocina apagada desde administración' }, { status: 401 });
  }
  const now = new Date().toISOString();
  const event = body.event || 'heartbeat';
  const endingShift = event === 'close' || event === 'end_shift';
  const shiftActive = endingShift ? false : Boolean(body.shiftActive);
  const autoPrint = endingShift ? false : Boolean(body.autoPrint);

  const patch: Record<string, unknown> = {
    shift_active: shiftActive,
    auto_print: autoPrint,
    updated_at: now,
  };

  if (endingShift) {
    patch.closed_at = now;
  } else {
    patch.last_seen_at = now;
    patch.closed_at = null;
  }

  if (event === 'print') {
    patch.last_print_at = now;
  }

  const gated = supabase.from('kitchen_station').update(patch).eq('id', branch.stationId);
  const saved = endingShift
    ? await gated.select('*').maybeSingle()
    : await gated.eq('admin_enabled', true).select('*').maybeSingle();

  if (saved.error) {
    return NextResponse.json({ error: saved.error.message }, { status: 500 });
  }

  let row = (saved.data || null) as KitchenStationRow | null;
  if (!row && !endingShift) {
    const again = await loadStation(supabase, branch.stationId);
    if (again) {
      return NextResponse.json({ error: 'Cocina apagada desde administración' }, { status: 401 });
    }
    const inserted = await supabase
      .from('kitchen_station')
      .insert({ id: branch.stationId, admin_enabled: true, session_generation: 0, ...patch })
      .select('*')
      .single();
    if (inserted.error || !inserted.data) {
      const lost = await loadStation(supabase, branch.stationId);
      if (lost?.admin_enabled === false) {
        return NextResponse.json({ error: 'Cocina apagada desde administración' }, { status: 401 });
      }
      return NextResponse.json({ error: inserted.error?.message || 'No se guardó la estación' }, { status: 500 });
    }
    row = inserted.data as KitchenStationRow;
  }

  if (!row) {
    return NextResponse.json({ error: 'No se guardó la estación' }, { status: 500 });
  }
  const notice = shiftNoticeKind(Boolean(previous?.shift_active), Boolean(row.shift_active));
  if (notice) {
    await sendKitchenShiftNotice(notice, branch.id);
  }

  void notifyKitchenWatch({
    branchId: branch.id,
    shiftActive: Boolean(row.shift_active),
    autoPrint: Boolean(row.auto_print),
    lastSeenAt: row.last_seen_at,
  }).catch(() => undefined);

  const response = NextResponse.json({
    station: viewKitchenStation(row as KitchenStationRow),
    branchName: branch.shortName,
    branchId: branch.id,
  });
  if (!endingShift) {
    const generation = row.session_generation;
    const token = await kitchenSessionToken(
      branch.id,
      typeof generation === 'number' && Number.isInteger(generation) && generation >= 0 ? generation : 0
    );
    if (token) {
      response.cookies.set(KITCHEN_COOKIE, token, kitchenCookieOptions());
    }
  }
  return response;
}
