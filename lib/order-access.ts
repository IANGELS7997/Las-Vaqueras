import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { createAdminSupabase } from '@/lib/supabase-admin';

export async function canAccessOrder(orderId: string, token?: string | null) {
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('orders')
    .select('id, customer_id, profile_login_token')
    .eq('id', orderId)
    .maybeSingle();
  if (!data) return false;
  if (token && data.profile_login_token && token === data.profile_login_token) return true;
  const customerId = await readCustomerIdFromRequest();
  if (customerId && data.customer_id === customerId) return true;
  return false;
}
