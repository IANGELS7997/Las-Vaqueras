import { NextResponse } from 'next/server';
import { branchById, isBranchId } from '@/lib/branches';
import { notifyKitchenWatch } from '@/lib/iangel-ops';
import { kitchenPowerPatch } from '@/lib/kitchen-power';
import { sendKitchenShiftNotice, type KitchenStationRow } from '@/lib/kitchen-station';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sameSecret(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = req.headers.get('x-webhook-secret') || '';
  const expected = process.env.IANGEL_OPS_WEBHOOK_SECRET || '';
  if (!sameSecret(secret, expected)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { branchId?: string; enabled?: boolean };
  if (!isBranchId(body.branchId) || typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'Falta la sucursal o el estado' }, { status: 400 });
  }

  const branch = branchById(body.branchId);
  const supabase = createAdminSupabase();
  const found = await supabase.from('kitchen_station').select('*').eq('id', branch.stationId).maybeSingle();
  if (found.error) return NextResponse.json({ error: found.error.message }, { status: 500 });

  const previous = (found.data || null) as KitchenStationRow | null;
  const now = new Date().toISOString();
  const patch = kitchenPowerPatch(previous, body.enabled, now);
  const saved = await supabase
    .from('kitchen_station')
    .upsert({ id: branch.stationId, ...patch }, { onConflict: 'id' })
    .select('*')
    .single();
  if (saved.error || !saved.data) {
    return NextResponse.json({ error: saved.error?.message || 'No se guardó la cocina' }, { status: 500 });
  }

  const row = saved.data as KitchenStationRow;
  if (!body.enabled && previous?.shift_active) {
    await sendKitchenShiftNotice('close', branch.id);
  }

  const watched = await notifyKitchenWatch({
    branchId: branch.id,
    shiftActive: Boolean(row.shift_active),
    autoPrint: Boolean(row.auto_print),
    lastSeenAt: row.last_seen_at,
    adminEnabled: body.enabled,
  });
  if (!watched) {
    return NextResponse.json({ error: 'La cocina cambió, pero el panel no se enteró. Intenta de nuevo.' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    branchId: branch.id,
    adminEnabled: body.enabled,
    shiftActive: Boolean(row.shift_active),
  });
}
