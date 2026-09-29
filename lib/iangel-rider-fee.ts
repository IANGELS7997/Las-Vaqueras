import * as Sentry from '@sentry/nextjs';
import type Stripe from 'stripe';
import {
  ADRIAN_DELIVERY_FEE_ACCOUNT,
  cashViewFromRow,
  deliveryFeeSettlement,
  RIDER_FEE_CENTAVOS,
  type FeeNotice,
} from '@/lib/iangel-cash';
import { closeIangelOpsOrder, type IangelOpsRow } from '@/lib/iangel-ops';
import { getStripe } from '@/lib/stripe';

function mxnAvailable(balance: Stripe.Balance) {
  return balance.available.find((row) => row.currency === 'mxn')?.amount ?? 0;
}

function isBalanceShort(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === 'balance_insufficient' || /insufficient/i.test(message);
}

async function findFeeTransfer(stripe: Stripe, orderId: string) {
  const listed = await stripe.transfers.list({
    destination: ADRIAN_DELIVERY_FEE_ACCOUNT,
    limit: 100,
  });
  return (
    listed.data.find(
      (transfer) =>
        transfer.metadata?.purpose === 'iangel_delivery_fee' && transfer.metadata?.orderId === orderId
    ) || null
  );
}

/** Un Transfer de $50, o nada si el saldo todavía no está disponible. La clave no cambia. */
export async function settleAdrianDeliveryFee(orderId: string): Promise<'created' | 'exists' | 'pending_balance'> {
  const stripe = getStripe();
  try {
    const existing = await findFeeTransfer(stripe, orderId);
    if (existing) return 'exists';
    const balance = await stripe.balance.retrieve();
    if (mxnAvailable(balance) < RIDER_FEE_CENTAVOS) return 'pending_balance';
    await stripe.transfers.create(
      {
        amount: RIDER_FEE_CENTAVOS,
        currency: 'mxn',
        destination: ADRIAN_DELIVERY_FEE_ACCOUNT,
        metadata: { purpose: 'iangel_delivery_fee', orderId },
      },
      { idempotencyKey: `order:${orderId}:rider_fee` }
    );
    return 'created';
  } catch (error) {
    if (!isBalanceShort(error)) Sentry.captureException(error);
    return 'pending_balance';
  }
}

export async function closeDeliveredWithFee(row: Record<string, unknown>) {
  const view = cashViewFromRow(row);
  const settlement = deliveryFeeSettlement({
    id: String(row.id || ''),
    payMethod: view.payMethod,
    riderKey: view.riderKey,
    deliveryProvider: view.deliveryProvider || null,
    fulfillment: view.fulfillment || null,
    status: 'delivered',
  });
  let notice: FeeNotice | null = settlement.notice;
  if (settlement.transfer.kind === 'transfer') {
    const result = await settleAdrianDeliveryFee(String(row.id || ''));
    if (result === 'pending_balance') notice = null;
  }
  await closeIangelOpsOrder(row as IangelOpsRow, 'delivered', notice);
}
