import { NextResponse } from 'next/server';
import { openPendingForPhone } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const phone = new URL(req.url).searchParams.get('phone') || '';
  try {
    const pending = await openPendingForPhone(createAdminSupabase(), phone);
    return NextResponse.json({ amountMxn: pending.amountMxn, label: pending.label });
  } catch {
    return NextResponse.json({ amountMxn: 0, label: '' });
  }
}
