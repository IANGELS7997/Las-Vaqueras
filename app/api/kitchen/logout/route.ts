import { NextResponse } from 'next/server';
import { branchById } from '@/lib/branches';
import { KITCHEN_COOKIE } from '@/lib/kitchen-auth';
import { sendKitchenShiftNotice } from '@/lib/kitchen-station';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST() {
  const branchId = await requireKitchenBranch();
  if (!(branchId instanceof NextResponse)) {
    const branch = branchById(branchId);
    try {
      const now = new Date().toISOString();
      const supabase = createAdminSupabase();
      const previous = await supabase
        .from('kitchen_station')
        .select('shift_active')
        .eq('id', branch.stationId)
        .maybeSingle();
      await supabase.from('kitchen_station').upsert(
        {
          id: branch.stationId,
          shift_active: false,
          auto_print: false,
          closed_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
      if (previous.data?.shift_active) {
        await sendKitchenShiftNotice('close', branch.id);
      }
    } catch {
      /* Salir cierra la sesión aunque la estación no responda. */
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(KITCHEN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
