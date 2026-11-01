import { createAdminSupabase } from '@/lib/supabase-admin';

const ROW_ID = 'store';

/** Si la lectura falla, la tienda sigue el horario. No se cierra por un fallo de red. */
export async function readManualClosure(): Promise<boolean> {
  try {
    const supabase = createAdminSupabase();
    const found = await supabase.from('public_closure').select('closed').eq('id', ROW_ID).maybeSingle();
    if (found.error || !found.data) return false;
    return found.data.closed === true;
  } catch {
    return false;
  }
}

export async function writeManualClosure(closed: boolean) {
  const supabase = createAdminSupabase();
  const saved = await supabase
    .from('public_closure')
    .upsert({ id: ROW_ID, closed, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('closed')
    .single();
  if (saved.error || !saved.data) {
    throw new Error(saved.error?.message || 'No se guardó el cierre');
  }
  return saved.data.closed === true;
}
