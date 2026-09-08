import type { SupabaseClient } from '@supabase/supabase-js';
import { fullCustomerName, normalizeNameKey, normalizePhone } from '@/lib/customer-identity';

export type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  first_name_key: string;
  last_name_key: string;
  phone: string;
  email: string;
  avatar_path: string | null;
  created_at: string;
};

export function avatarPublicUrl(path: string | null) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/customer-avatars/${path}`;
}

export async function upsertCustomer(
  supabase: SupabaseClient,
  input: { firstName: string; lastName: string; phone: string; email: string }
) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const firstKey = normalizeNameKey(firstName);
  const lastKey = normalizeNameKey(lastName);

  const existing = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
  if (existing.data) {
    const updated = await supabase
      .from('customers')
      .update({
        first_name: firstName,
        last_name: lastName,
        first_name_key: firstKey,
        last_name_key: lastKey,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.data.id)
      .select('*')
      .single();
    if (updated.error) throw new Error(updated.error.message);
    return updated.data as CustomerRow;
  }

  const created = await supabase
    .from('customers')
    .insert({
      first_name: firstName,
      last_name: lastName,
      first_name_key: firstKey,
      last_name_key: lastKey,
      phone,
      email,
    })
    .select('*')
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data as CustomerRow;
}

export function customerDisplayName(row: Pick<CustomerRow, 'first_name' | 'last_name'>) {
  return fullCustomerName(row.first_name, row.last_name);
}
