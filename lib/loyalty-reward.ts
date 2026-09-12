import type { CartItem } from '@/types';
import { giftCreditBase } from '@/lib/gift-cart';
import { JUMBO_PRODUCT_ID } from '@/lib/loyalty';
import type { createAdminSupabase } from '@/lib/supabase-admin';

type Client = ReturnType<typeof createAdminSupabase>;

export const JUMBO_REDEEM_COOKIE = 'lv_jumbo_redeem';
const RESERVE_MS = 30 * 60 * 1000;
const REWARD_DAYS = 30;

export type LoyaltyRewardRow = {
  id: string;
  customer_id: string;
  kind: string;
  status: string;
  expires_at: string | null;
  code?: string | null;
  code_hash?: string | null;
  redeemed_order_id?: string | null;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createRewardCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function normalizeRewardCode(code: string) {
  return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

function sessionSecret() {
  return (
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.KITCHEN_PASSWORD ||
    ''
  );
}

async function hmacHex(payload: string) {
  const secret = sessionSecret();
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashRewardCode(code: string) {
  return hmacHex(`jumbo-code:${code.trim().toUpperCase()}`);
}

export function jumboGiftBase(items: CartItem[]) {
  return giftCreditBase(items);
}

export async function getAvailableJumboReward(
  supabase: Client,
  customerId: string
): Promise<LoyaltyRewardRow | null> {
  const now = Date.now();
  const rows = await supabase
    .from('loyalty_rewards')
    .select('id, customer_id, kind, status, expires_at, reserved_at, code, code_hash')
    .eq('customer_id', customerId)
    .eq('kind', 'tenth_jumbo')
    .in('status', ['available', 'reserved']);

  for (const row of rows.data || []) {
    const expiresAt = row.expires_at ? new Date(String(row.expires_at)).getTime() : Number.POSITIVE_INFINITY;
    if (expiresAt < now) {
      await supabase.from('loyalty_rewards').update({ status: 'expired' }).eq('id', row.id);
      continue;
    }
    if (row.status === 'available') return row as LoyaltyRewardRow;
    const reservedAt = row.reserved_at ? new Date(String(row.reserved_at)).getTime() : 0;
    if (now - reservedAt >= RESERVE_MS) return row as LoyaltyRewardRow;
  }
  return null;
}

export async function getLatestRedeemedJumboReward(
  supabase: Client,
  customerId: string
): Promise<LoyaltyRewardRow | null> {
  const row = await supabase
    .from('loyalty_rewards')
    .select('id, customer_id, kind, status, expires_at, code, redeemed_order_id')
    .eq('customer_id', customerId)
    .eq('kind', 'tenth_jumbo')
    .eq('status', 'redeemed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (row.data as LoyaltyRewardRow) || null;
}

export async function grantJumboReward(
  supabase: Client,
  customerId: string,
  earnedOrderId: string
) {
  const existing = await getAvailableJumboReward(supabase, customerId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createRewardCode();
    const created = await supabase
      .from('loyalty_rewards')
      .insert({
        customer_id: customerId,
        kind: 'tenth_jumbo',
        status: 'available',
        code,
        code_hash: await hashRewardCode(code),
        earned_order_id: earnedOrderId,
        expires_at: new Date(Date.now() + REWARD_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, customer_id, kind, status, expires_at, code')
      .single();
    if (!created.error) return created.data as LoyaltyRewardRow;
  }
  return null;
}

export async function rewardMatchesCode(reward: LoyaltyRewardRow, code: string) {
  const normalized = normalizeRewardCode(code);
  if (normalized.length !== 6) return false;
  if (reward.code && normalizeRewardCode(reward.code) === normalized) return true;
  const hashed = await hashRewardCode(normalized);
  return Boolean(reward.code_hash && reward.code_hash === hashed);
}

export async function reserveJumboReward(
  supabase: Client,
  rewardId: string,
  customerId: string,
  paymentIntentId: string
) {
  const now = new Date().toISOString();
  const updated = await supabase
    .from('loyalty_rewards')
    .update({
      status: 'reserved',
      reserved_payment_intent_id: paymentIntentId,
      reserved_at: now,
    })
    .eq('id', rewardId)
    .eq('customer_id', customerId)
    .in('status', ['available', 'reserved'])
    .select('id')
    .maybeSingle();
  return Boolean(updated.data);
}

export async function redeemJumboReward(
  supabase: Client,
  rewardId: string,
  customerId: string,
  orderId: string,
  paymentIntentId?: string
) {
  const updated = await supabase
    .from('loyalty_rewards')
    .update({
      status: 'redeemed',
      redeemed_order_id: orderId,
    })
    .eq('id', rewardId)
    .eq('customer_id', customerId)
    .in('status', ['available', 'reserved'])
    .select('id, reserved_payment_intent_id')
    .maybeSingle();
  if (!updated.data) return false;
  const reservedPi = updated.data.reserved_payment_intent_id as string | null;
  if (paymentIntentId && reservedPi && reservedPi !== paymentIntentId) {
    await supabase
      .from('loyalty_rewards')
      .update({ status: 'reserved', redeemed_order_id: null })
      .eq('id', rewardId);
    return false;
  }
  return true;
}

export async function signRedeemCookie(rewardId: string, customerId: string) {
  const exp = String(Date.now() + RESERVE_MS);
  const signature = await hmacHex(`${rewardId}.${customerId}.${exp}`);
  return `${rewardId}.${customerId}.${exp}.${signature}`;
}

export async function readRedeemCookie(value: string | undefined, customerId: string) {
  if (!value) return null;
  const [rewardId, cookieCustomerId, exp, signature] = value.split('.');
  if (!rewardId || !cookieCustomerId || !exp || !signature) return null;
  if (cookieCustomerId !== customerId) return null;
  if (Number(exp) < Date.now()) return null;
  const expected = await hmacHex(`${rewardId}.${cookieCustomerId}.${exp}`);
  if (!expected || expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i += 1) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0 ? rewardId : null;
}

export function jumboRedeemCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 30,
  };
}
