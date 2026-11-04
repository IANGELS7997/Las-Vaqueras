import { orderBranchId, type BranchId } from '@/lib/branches';
import type { PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { isHandoffPin, sendHandoffPinEmails, type HandoffPinSource } from '@/lib/handoff-pin-email';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { createAdminSupabase } from '@/lib/supabase-admin';
import type { Order } from '@/types';

export type HandoffPinResult =
  | { ok: true; pin: string; order: Order }
  | { ok: false; status: number; error: string };

const CLOSED = new Set(['delivered', 'cancelled', 'awaiting_payment']);

/** Guarda la clave y manda el correo al cliente y el aviso interno. */
export async function commitHandoffPin(input: {
  orderId: string;
  pin: string;
  source: HandoffPinSource;
  branchId?: BranchId;
}): Promise<HandoffPinResult> {
  const orderId = input.orderId.trim();
  const pin = input.pin.trim();
  if (!orderId || !isHandoffPin(pin)) {
    return { ok: false, status: 400, error: 'Escribe un PIN de 4 dígitos' };
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  const row = current.data as PurchaseNoticeRow | null;
  if (current.error) return { ok: false, status: 500, error: current.error.message };
  if (!row || (input.branchId && orderBranchId(row.branch_id) !== input.branchId)) {
    return { ok: false, status: 404, error: 'Pedido no encontrado' };
  }
  if (row.delivery_provider !== 'managed') {
    return { ok: false, status: 400, error: 'La clave solo se envía en Gestionar pedido' };
  }
  if (CLOSED.has(String(row.status || ''))) {
    return { ok: false, status: 400, error: 'Este pedido ya no está en curso' };
  }
  const email = String(row.customer_email || '').trim();
  if (!email.includes('@')) {
    return { ok: false, status: 400, error: 'Este pedido no tiene correo del cliente' };
  }

  const saved = await supabase.from('orders').update({ handoff_pin: pin }).eq('id', orderId).select('*').maybeSingle();
  if (saved.error || !saved.data) {
    return { ok: false, status: 500, error: saved.error?.message || 'No se guardó la clave' };
  }

  const mailed = await sendHandoffPinEmails(saved.data as PurchaseNoticeRow, pin, input.source);
  if (!mailed.customerOk && !mailed.developerOk) {
    return { ok: false, status: 502, error: 'La clave quedó guardada, pero los correos no salieron' };
  }
  if (!mailed.customerOk) {
    return { ok: false, status: 502, error: 'La clave quedó guardada, pero el correo al cliente no salió' };
  }
  if (!mailed.developerOk) {
    return { ok: false, status: 502, error: 'La clave salió al cliente, pero el aviso interno no' };
  }

  return {
    ok: true,
    pin,
    order: mapDbOrder(saved.data as DbOrderRow, { includeHandoffPin: true }),
  };
}
