import type { createAdminSupabase } from '@/lib/supabase-admin';
import {
  type LoyaltyKind,
  addressKey,
  loyaltyKindForOrdinal,
  normalizeEmail,
  normalizePhone,
  paidOrderOrdinal,
} from '@/lib/loyalty';

type Client = ReturnType<typeof createAdminSupabase>;

const FIRST_IP_WINDOW_HOURS = 24;
const FIRST_IP_MAX = 2;

export async function countPaidOrders(supabase: Client, customerId: string): Promise<number> {
  const result = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
    .neq('status', 'awaiting_payment')
    .neq('status', 'cancelled');
  return result.count ?? 0;
}

export async function findCustomerIdByPhone(supabase: Client, phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return null;
  const row = await supabase.from('customers').select('id, phone').eq('phone', normalized).maybeSingle();
  if (row.data?.id) return row.data.id as string;
  const raw = await supabase.from('customers').select('id, phone');
  const match = (raw.data || []).find((item) => normalizePhone(String(item.phone || '')) === normalized);
  return match?.id ? String(match.id) : null;
}

export async function first30AlreadyClaimed(
  supabase: Client,
  keys: {
    customerId?: string | null;
    phone: string;
    email: string;
    cardFingerprint?: string | null;
    ip: string;
    addressKey: string;
  }
): Promise<boolean> {
  const phone = normalizePhone(keys.phone);
  const email = normalizeEmail(keys.email);
  const safe = (value: string) => value.replace(/[",()\\]/g, '');
  const orParts = [
    phone ? `phone.eq."${safe(phone)}"` : '',
    email ? `email.eq."${safe(email)}"` : '',
    keys.customerId ? `customer_id.eq.${keys.customerId}` : '',
    keys.cardFingerprint ? `card_fingerprint.eq."${safe(keys.cardFingerprint)}"` : '',
    keys.addressKey ? `address_key.eq."${safe(keys.addressKey)}"` : '',
  ].filter(Boolean);

  if (orParts.length) {
    const claimed = await supabase
      .from('loyalty_claims')
      .select('id')
      .eq('kind', 'first_30')
      .or(orParts.join(','))
      .limit(1);
    if ((claimed.data || []).length > 0) return true;
  }

  if (keys.ip && keys.ip !== 'unknown') {
    const since = new Date(Date.now() - FIRST_IP_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const ipHits = await supabase
      .from('loyalty_claims')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'first_30')
      .eq('ip', keys.ip)
      .gte('created_at', since);
    if ((ipHits.count ?? 0) >= FIRST_IP_MAX) return true;
  }

  return false;
}

export async function resolveLoyaltyKind(args: {
  supabase: Client;
  customerId: string | null;
  phone: string;
  email: string;
  ip: string;
  street?: string;
  extNumber?: string;
  postalCode?: string;
  address?: string;
  isPickup: boolean;
  cookieCustomerId?: string | null;
}): Promise<LoyaltyKind | null> {
  const customerId = args.customerId || args.cookieCustomerId || null;
  const paid = customerId ? await countPaidOrders(args.supabase, customerId) : 0;
  const ordinal = paidOrderOrdinal(paid);
  let kind = loyaltyKindForOrdinal(ordinal);
  if (!kind) return null;

  if (kind === 'first_30') {
    const blocked = await first30AlreadyClaimed(args.supabase, {
      customerId,
      phone: args.phone,
      email: args.email,
      ip: args.ip,
      addressKey: args.isPickup
        ? ''
        : addressKey({
            street: args.street,
            extNumber: args.extNumber,
            postalCode: args.postalCode,
            address: args.address,
          }),
    });
    if (blocked) return null;
  }

  return kind;
}
