import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { requireKitchenSession } from '@/lib/kitchen-guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const denied = await requireKitchenSession();
  if (denied) return denied;

  const { productId, isAvailable } = await req.json();
  if (typeof productId !== 'string' || typeof isAvailable !== 'boolean') {
    return NextResponse.json({ error: 'productId e isAvailable son requeridos' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const { error } = await supabase.from('products').update({ is_available: isAvailable }).eq('id', productId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
