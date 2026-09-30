import { NextResponse } from 'next/server';
import { KITCHEN_COOKIE } from '@/lib/kitchen-auth';
import { KITCHEN_STATION_ID } from '@/lib/kitchen-station';
import { requireKitchenSession } from '@/lib/kitchen-guard';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST() {
  const denied = await requireKitchenSession();
  if (!denied) {
    try {
      const now = new Date().toISOString();
      const supabase = createAdminSupabase();
      await supabase.from('kitchen_station').upsert(
        {
          id: KITCHEN_STATION_ID,
          shift_active: false,
          auto_print: false,
          closed_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
    } catch {
      /* Salir cierra la sesión aunque la estación no responda. */
    }
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(KITCHEN_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
