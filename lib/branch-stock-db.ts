import type { BranchId } from '@/lib/branches';
import { isStockItemId } from '@/lib/branch-stock';
import { createAdminSupabase } from '@/lib/supabase-admin';

export async function listOutOfStock(branchId: BranchId): Promise<string[]> {
  const supabase = createAdminSupabase();
  const found = await supabase.from('branch_stock').select('item_id').eq('branch_id', branchId);
  if (found.error) throw new Error(found.error.message);
  return (found.data || []).map((row) => String(row.item_id)).filter(isStockItemId);
}

export async function setOutOfStock(branchId: BranchId, itemId: string, outOfStock: boolean) {
  if (!isStockItemId(itemId)) throw new Error('Ese artículo no está en el menú');
  const supabase = createAdminSupabase();
  if (!outOfStock) {
    const removed = await supabase.from('branch_stock').delete().eq('branch_id', branchId).eq('item_id', itemId);
    if (removed.error) throw new Error(removed.error.message);
    return;
  }
  const saved = await supabase.from('branch_stock').upsert(
    { branch_id: branchId, item_id: itemId, updated_at: new Date().toISOString() },
    { onConflict: 'branch_id,item_id' }
  );
  if (saved.error) throw new Error(saved.error.message);
}
