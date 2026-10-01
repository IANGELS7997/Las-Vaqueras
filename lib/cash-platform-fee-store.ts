import type { SupabaseClient } from '@supabase/supabase-js';
import { allocateCashFees, CASH_FEE_HOLD_MS, type OpenCashFee } from '@/lib/cash-platform-fee';

type FeeOrder = {
  id: string;
  cash_platform_fee_centavos: number;
  cash_platform_locked_centavos: number;
};

type CollectionRow = {
  id: string;
  cash_order_id: string;
  payment_intent_id: string;
  amount_centavos: number;
  status: string;
  created_at: string;
};

function centavos(value: unknown) {
  const n = Math.round(Number(value || 0));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function lockOrder(supabase: SupabaseClient, orderId: string, current: number, next: number) {
  const updated = await supabase
    .from('orders')
    .update({ cash_platform_locked_centavos: next })
    .eq('id', orderId)
    .eq('cash_platform_locked_centavos', current)
    .select('id');
  return Boolean(updated.data && updated.data.length > 0);
}

async function reservedByHold(supabase: SupabaseClient, holdId: string) {
  const found = await supabase
    .from('cash_platform_collections')
    .select('id, cash_order_id, payment_intent_id, amount_centavos, status, created_at')
    .eq('payment_intent_id', holdId)
    .eq('status', 'reserved');
  return (found.data || []) as CollectionRow[];
}

/** Suelta una reserva. El monto vuelve a quedar abierto. */
export async function releaseCashPlatformHold(supabase: SupabaseClient, holdId: string) {
  const rows = await reservedByHold(supabase, holdId);
  for (const row of rows) {
    const released = await supabase
      .from('cash_platform_collections')
      .update({ status: 'released' })
      .eq('id', row.id)
      .eq('status', 'reserved')
      .select('id');
    if (!released.data || released.data.length === 0) continue;
    const order = await supabase
      .from('orders')
      .select('cash_platform_locked_centavos')
      .eq('id', row.cash_order_id)
      .maybeSingle();
    const current = centavos(order.data?.cash_platform_locked_centavos);
    const next = Math.max(0, current - centavos(row.amount_centavos));
    await lockOrder(supabase, row.cash_order_id, current, next);
  }
}

async function releaseStaleHolds(supabase: SupabaseClient) {
  const since = new Date(Date.now() - CASH_FEE_HOLD_MS).toISOString();
  const found = await supabase
    .from('cash_platform_collections')
    .select('payment_intent_id, created_at')
    .eq('status', 'reserved')
    .lt('created_at', since);
  const holds = new Set<string>();
  for (const row of found.data || []) {
    const pi = String(row.payment_intent_id || '');
    if (!pi) continue;
    if (pi.startsWith('hold:')) {
      holds.add(pi);
      continue;
    }
    const order = await supabase
      .from('orders')
      .select('status, created_at')
      .eq('stripe_payment_intent_id', pi)
      .maybeSingle();
    const status = String(order.data?.status || '');
    const created = String(order.data?.created_at || '');
    if (!order.data || status === 'cancelled' || (status === 'awaiting_payment' && created < since)) {
      holds.add(pi);
    }
  }
  for (const holdId of Array.from(holds)) {
    await releaseCashPlatformHold(supabase, holdId);
  }
}

async function openFees(supabase: SupabaseClient): Promise<Array<OpenCashFee & { locked: number }>> {
  const found = await supabase
    .from('orders')
    .select('id, cash_platform_fee_centavos, cash_platform_locked_centavos')
    .eq('pay_method', 'cash')
    .neq('status', 'cancelled')
    .gt('cash_platform_fee_centavos', 0)
    .order('created_at', { ascending: true })
    .limit(40);
  return ((found.data || []) as FeeOrder[])
    .map((row) => {
      const fee = centavos(row.cash_platform_fee_centavos);
      const locked = centavos(row.cash_platform_locked_centavos);
      return { id: row.id, openCentavos: Math.max(0, fee - locked), locked };
    })
    .filter((row) => row.openCentavos > 0);
}

/** Aparta comisiones de efectivo antes de crear el cobro con tarjeta. */
export async function reserveCashPlatformFees(supabase: SupabaseClient, ownerPayoutCentavos: number) {
  await releaseStaleHolds(supabase);
  const open = await openFees(supabase);
  const allocation = allocateCashFees(ownerPayoutCentavos, open);
  const holdId = `hold:${crypto.randomUUID()}`;
  let takenCentavos = 0;
  const lockedById = new Map(open.map((row) => [row.id, row.locked]));
  for (const take of allocation.takes) {
    const current = lockedById.get(take.id) ?? 0;
    const next = current + take.centavos;
    const locked = await lockOrder(supabase, take.id, current, next);
    if (!locked) continue;
    const inserted = await supabase.from('cash_platform_collections').insert({
      cash_order_id: take.id,
      payment_intent_id: holdId,
      amount_centavos: take.centavos,
      status: 'reserved',
    });
    if (inserted.error) {
      await lockOrder(supabase, take.id, next, current);
      continue;
    }
    lockedById.set(take.id, next);
    takenCentavos += take.centavos;
  }
  return { holdId, takenCentavos };
}

export async function attachCashPlatformHold(supabase: SupabaseClient, holdId: string, paymentIntentId: string) {
  await supabase
    .from('cash_platform_collections')
    .update({ payment_intent_id: paymentIntentId })
    .eq('payment_intent_id', holdId)
    .eq('status', 'reserved');
}

/** El pago con tarjeta ya pasó. La reserva queda cobrada. */
export async function settleCashPlatformFees(supabase: SupabaseClient, paymentIntentId: string) {
  if (!paymentIntentId) return;
  await supabase
    .from('cash_platform_collections')
    .update({ status: 'settled' })
    .eq('payment_intent_id', paymentIntentId)
    .eq('status', 'reserved');
}

/** Un reembolso de esa tarjeta devuelve la comisión a pendiente. */
export async function reopenCashPlatformFees(supabase: SupabaseClient, paymentIntentId: string) {
  if (!paymentIntentId) return;
  const found = await supabase
    .from('cash_platform_collections')
    .select('id, cash_order_id, amount_centavos')
    .eq('payment_intent_id', paymentIntentId)
    .eq('status', 'settled');
  for (const row of found.data || []) {
    const released = await supabase
      .from('cash_platform_collections')
      .update({ status: 'released' })
      .eq('id', row.id)
      .eq('status', 'settled')
      .select('id');
    if (!released.data || released.data.length === 0) continue;
    const order = await supabase
      .from('orders')
      .select('cash_platform_locked_centavos')
      .eq('id', row.cash_order_id)
      .maybeSingle();
    const current = centavos(order.data?.cash_platform_locked_centavos);
    const next = Math.max(0, current - centavos(row.amount_centavos));
    await lockOrder(supabase, String(row.cash_order_id), current, next);
  }
}

/** El pedido en efectivo se canceló. Lo ya cobrado en una tarjeta se queda; el resto no. */
export async function dropUncollectedCashFee(supabase: SupabaseClient, orderId: string) {
  const found = await supabase
    .from('cash_platform_collections')
    .select('id, amount_centavos, status')
    .eq('cash_order_id', orderId);
  let settled = 0;
  for (const row of found.data || []) {
    if (row.status === 'settled') {
      settled += centavos(row.amount_centavos);
      continue;
    }
    if (row.status !== 'reserved') continue;
    const released = await supabase
      .from('cash_platform_collections')
      .update({ status: 'released' })
      .eq('id', row.id)
      .eq('status', 'reserved')
      .select('id');
    if (!released.data || released.data.length === 0) continue;
    const order = await supabase
      .from('orders')
      .select('cash_platform_locked_centavos')
      .eq('id', orderId)
      .maybeSingle();
    const current = centavos(order.data?.cash_platform_locked_centavos);
    const next = Math.max(0, current - centavos(row.amount_centavos));
    await lockOrder(supabase, orderId, current, next);
  }
  await supabase
    .from('orders')
    .update({
      cash_platform_fee_centavos: settled,
      cash_platform_locked_centavos: settled,
    })
    .eq('id', orderId)
    .eq('cash_platform_locked_centavos', settled);
}
