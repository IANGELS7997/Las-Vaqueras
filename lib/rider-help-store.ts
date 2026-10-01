import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyIangelHelp } from '@/lib/iangel-ops';
import { saveRiderPresence } from '@/lib/iangel-presence';
import { normalizePhone } from '@/lib/loyalty';
import {
  closePlan,
  falseReportDebt,
  foodMxnFromOrder,
  HELP_LABELS,
  helpStepError,
  incompleteRefundCredit,
  isHelpKind,
  REFUND_ACCEPTED_LABEL,
  REFUND_REJECTED_LABEL,
  REFUND_WINDOW_MS,
  riderLockCopy,
  stackedPendingLabel,
  waitElapsedSeconds,
  type HelpKind,
  type HelpPay,
  type HelpStep,
} from '@/lib/rider-help';
import { sendDoorDecisionEmails, sendHelpEmails } from '@/lib/help-email';
import { closeDeliveredWithFee } from '@/lib/iangel-rider-fee';

type OrderRow = Record<string, unknown>;

function payOf(row: OrderRow): HelpPay {
  return row.pay_method === 'cash' ? 'cash' : 'card';
}

function phaseOf(dispatch: string) {
  if (!dispatch || dispatch === 'self_iangel' || dispatch === 'cook_hold') return 'offer';
  if (dispatch === 'assigned' || dispatch === 'picked_up') return 'pickup';
  if (dispatch === 'delivered' || dispatch === 'incident' || dispatch === 'delivered_unclaimed' || dispatch === 'help_return') {
    return 'done';
  }
  return 'dropoff';
}

function payoutCode() {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export async function saveHelpEvidence(supabase: SupabaseClient, orderId: string, dataUrl: string) {
  const match = /^data:((?:image|video)\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl.trim());
  if (!match) throw new Error('La evidencia tiene que ser foto o video');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length < 32 || bytes.length > 4_000_000) throw new Error('La evidencia no se pudo leer');
  const type = match[1].toLowerCase();
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('mp4') ? 'mp4' : type.includes('webm') ? 'webm' : 'jpg';
  const path = `${orderId}/${Date.now()}.${ext}`;
  const uploaded = await supabase.storage.from('help-evidence').upload(path, bytes, {
    contentType: type,
    upsert: false,
  });
  if (uploaded.error) throw new Error('No se guardó la evidencia');
  return path;
}

export async function openPendingForPhone(supabase: SupabaseClient, phone: string) {
  const key = normalizePhone(phone);
  if (key.length < 10) return { amountMxn: 0, creditMxn: 0, label: '', ids: [] as string[], creditIds: [] as string[] };
  const found = await supabase
    .from('customer_pending_balances')
    .select('id, label, amount_mxn')
    .eq('phone', key)
    .eq('status', 'open');
  if (found.error) throw new Error(found.error.message);
  const rows = found.data || [];
  const amountMxn = rows.reduce((sum, row) => sum + Math.max(0, Number(row.amount_mxn || 0)), 0);
  const credits = rows.filter((row) => Number(row.amount_mxn || 0) < 0);
  const creditMxn = credits.reduce((sum, row) => sum + Number(row.amount_mxn || 0), 0);
  return {
    amountMxn,
    creditMxn,
    label: stackedPendingLabel(rows.map((row) => String(row.label || ''))),
    ids: rows.map((row) => String(row.id)),
    creditIds: credits.map((row) => String(row.id)),
  };
}

export function pendingAdjustment(
  orderTotal: number,
  pending: { amountMxn: number; creditMxn?: number; ids: string[]; creditIds?: string[] }
) {
  const credit = Math.min(0, Number(pending.creditMxn || 0));
  const fits = orderTotal + pending.amountMxn + credit >= 0;
  const creditIds = new Set(pending.creditIds || []);
  return {
    extra: pending.amountMxn + (fits ? credit : 0),
    settleIds: fits ? pending.ids : pending.ids.filter((id) => !creditIds.has(id)),
  };
}

export async function settlePendingBalances(supabase: SupabaseClient, ids: string[]) {
  const clean = ids.map((id) => id.trim()).filter(Boolean);
  if (clean.length === 0) return;
  await supabase.from('customer_pending_balances').update({ status: 'paid' }).in('id', clean).eq('status', 'open');
}

export async function submitRiderHelp(
  supabase: SupabaseClient,
  row: OrderRow,
  riderKey: string,
  input: { kind: string; step: string; note: string; evidencePath: string; policeReport: string }
) {
  if (!isHelpKind(input.kind)) throw new Error('Esa situación no está en Ayuda');
  const step: HelpStep = input.step === 'close' ? 'close' : 'notice';
  const kind: HelpKind = input.kind;
  const pay = payOf(row);
  const dispatch = String(row.dispatch_status || '');
  const elapsed = waitElapsedSeconds(typeof row.wait_started_at === 'string' ? row.wait_started_at : null);
  const evidence = Boolean(input.evidencePath);
  const problem = helpStepError({
    kind,
    step,
    pay,
    leaveAtDoor: row.leave_at_door === true,
    elapsed,
    phase: phaseOf(dispatch),
    evidence,
    policeReport: input.policeReport,
  });
  if (problem) throw new Error(problem);

  const food = foodMxnFromOrder(row);
  if (kind === 'refused_pay' && step === 'close' && input.note.trim().length < 8) {
    throw new Error('Escribe lo que dijo el cliente');
  }
  const hasBag = phaseOf(dispatch) === 'dropoff' || dispatch === 'picked_up';
  const plan = step === 'close' ? closePlan(kind, pay, food, hasBag) : null;
  const code = plan && plan.kitchenPay > 0 ? payoutCode() : null;
  const note = [input.note.trim(), input.policeReport.trim() ? `Reporte ${input.policeReport.trim()}` : '']
    .filter(Boolean)
    .join(' · ')
    .slice(0, 500);
  const existing = await supabase
    .from('rider_help_reports')
    .select('id, payout_code, phase')
    .eq('order_id', row.id)
    .eq('kind', kind)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const savedCode = code || (typeof existing.data?.payout_code === 'string' ? existing.data.payout_code : null);
  const record = {
    order_id: row.id,
    rider_key: riderKey,
    kind,
    phase: step === 'close' ? 'closed' : 'notice',
    pay_method: pay,
    food_mxn: food,
    rider_due_mxn: plan?.kitchenPay || 0,
    customer_due_mxn: plan?.customerDue || 0,
    customer_label: plan?.customerLabel || null,
    note,
    evidence_path: input.evidencePath || null,
    payout_code: savedCode,
    lock_until: plan?.lockUntil || null,
    updated_at: new Date().toISOString(),
  };
  const saved = existing.data
    ? await supabase.from('rider_help_reports').update(record).eq('id', existing.data.id).select('id').single()
    : await supabase.from('rider_help_reports').insert(record).select('id').single();
  if (saved.error) throw new Error(saved.error.message);

  const orderPatch: Record<string, unknown> = {
    help_kind: kind,
    help_label: HELP_LABELS[kind],
    help_code: savedCode,
  };
  if (plan?.closesTrip) {
    orderPatch.dispatch_status = plan.dispatchStatus;
    if (plan.orderStatus) orderPatch.status = plan.orderStatus;
    orderPatch.incident_type = kind;
  }
  const updated = await supabase.from('orders').update(orderPatch).eq('id', row.id).select('*').single();
  if (updated.error) throw new Error(updated.error.message);
  if (plan?.keepDeliveryFee && plan.orderStatus === 'delivered') {
    void closeDeliveredWithFee(updated.data as Record<string, unknown>).catch(() => undefined);
  }

  if (plan && plan.customerDue > 0 && plan.customerLabel) {
    const phone = normalizePhone(String(row.customer_phone || ''));
    const prior = await supabase
      .from('customer_pending_balances')
      .select('id')
      .eq('source_order_id', row.id)
      .limit(1);
    if (phone.length >= 10 && !prior.error && (prior.data || []).length === 0) {
      await supabase.from('customer_pending_balances').insert({
        phone,
        source_order_id: row.id,
        label: plan.customerLabel,
        amount_mxn: plan.customerDue,
        status: 'open',
      });
    }
  }

  const lockText = plan
    ? riderLockCopy({ kind, code: savedCode, kitchenPay: plan.kitchenPay, debt: plan.riderDebt, food })
    : '';
  if (plan && (plan.lockUntil || plan.riderDebt > 0) && lockText) {
    await saveRiderPresence(riderKey, {
      help_lock_note: lockText,
      help_lock_order_id: row.id,
      rider_active: false,
    });
  }
  if (lockText) {
    await supabase.from('order_messages').insert({
      order_id: row.id,
      actor: 'system',
      kind: 'system',
      body: lockText,
    });
  }

  const shortCode = String(row.short_code || String(row.id).replace(/-/g, '').slice(0, 4)).toUpperCase();
  void sendHelpEmails({
    kind,
    pay,
    orderId: String(row.id),
    token: typeof row.profile_login_token === 'string' ? row.profile_login_token : null,
    code: savedCode,
    customerEmail: typeof row.customer_email === 'string' ? row.customer_email : null,
    customerName: String(row.customer_name || ''),
    shortCode,
    note,
  }).catch(() => undefined);

  void notifyIangelHelp({
    reportId: String(saved.data.id),
    externalId: String(row.id),
    kind,
    label: HELP_LABELS[kind],
    phase: record.phase,
    payMethod: pay,
    foodMxn: food,
    riderDueMxn: plan?.kitchenPay || 0,
    customerDueMxn: plan?.customerDue || 0,
    note,
    payoutCode: savedCode,
    detail: lockText,
  }).catch(() => undefined);

  return {
    ok: true,
    label: HELP_LABELS[kind],
    code: savedCode,
    amount: plan?.kitchenPay || 0,
    message: lockText || (step === 'notice' ? 'Aviso enviado. El viaje sigue.' : 'Reporte guardado.'),
    order: updated.data,
  };
}

export async function payHelpAtRegister(supabase: SupabaseClient, orderId: string, code: string) {
  const found = await supabase
    .from('rider_help_reports')
    .select('*')
    .eq('order_id', orderId)
    .not('payout_code', 'is', null)
    .order('created_at', { ascending: false });
  if (found.error) throw new Error(found.error.message);
  const row = (found.data || []).find((item) => String(item.payout_code) === code.trim());
  if (!row) throw new Error('Ese código no corresponde a este pedido');
  if (row.payout_paid_at) throw new Error('Ese código ya se cobró');
  const paid = await supabase
    .from('rider_help_reports')
    .update({ payout_paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', row.id);
  if (paid.error) throw new Error(paid.error.message);
  if (row.lock_until === 'payout') {
    await saveRiderPresence(String(row.rider_key), { help_lock_note: null, help_lock_order_id: null });
  }
  await supabase
    .from('orders')
    .update({ status: 'delivered', dispatch_status: 'delivered', rider_status: 'idle' })
    .eq('id', orderId)
    .neq('status', 'cancelled');
  return { ok: true, amount: Number(row.rider_due_mxn || 0) };
}

async function resolveDoorMissing(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
  decision: 'approved' | 'rejected'
) {
  const orderId = String(row.order_id || '');
  const order = await supabase
    .from('orders')
    .select('total_charged, customer_email, customer_name, short_code, pay_method')
    .eq('id', orderId)
    .maybeSingle();
  if (order.error) throw new Error(order.error.message);
  const total = Math.max(0, Math.round(Number(order.data?.total_charged || 0)));
  const debt = decision === 'approved' ? total : 0;
  const lockText =
    debt > 0
      ? `Debes $${debt} porque el pedido no se dejó en la puerta. No puedes conectarte ni recibir pedidos nuevos hasta pagarlo. Paga ese monto en la tienda o por transferencia y avisa en este chat cuando esté pagado.`
      : '';
  const updated = await supabase
    .from('rider_help_reports')
    .update({
      resolution: decision,
      phase: 'resolved',
      rider_due_mxn: debt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', String(row.id));
  if (updated.error) throw new Error(updated.error.message);
  if (debt > 0) {
    await saveRiderPresence(String(row.rider_key), {
      help_lock_note: lockText,
      help_lock_order_id: orderId,
      rider_active: false,
    });
    await supabase.from('order_messages').insert({
      order_id: orderId,
      actor: 'system',
      kind: 'system',
      body: lockText,
    });
    const short = String(order.data?.short_code || orderId.replace(/-/g, '').slice(0, 4)).toUpperCase();
    void sendDoorDecisionEmails({
      orderId,
      shortCode: short,
      amount: debt,
      customerEmail: typeof order.data?.customer_email === 'string' ? order.data.customer_email : null,
      customerName: String(order.data?.customer_name || ''),
      payMethod: String(order.data?.pay_method || 'card'),
    }).catch(() => undefined);
  }
  void notifyIangelHelp({
    reportId: String(row.id),
    externalId: orderId,
    kind: 'door_missing',
    label: 'No dejaron el pedido en la puerta',
    phase: 'resolved',
    payMethod: String(order.data?.pay_method || 'card'),
    foodMxn: 0,
    riderDueMxn: debt,
    customerDueMxn: debt,
    note: String(row.note || ''),
    resolution: decision,
    detail: lockText,
  }).catch(() => undefined);
  return { ok: true, decision, kitchenPay: 0, debt };
}

export async function resolveHelpReport(
  supabase: SupabaseClient,
  reportId: string,
  decision: 'approved' | 'rejected' | 'deposited'
) {
  const found = await supabase.from('rider_help_reports').select('*').eq('id', reportId).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (!found.data) throw new Error('Reporte no encontrado');
  const row = found.data;
  if (decision === 'deposited') {
    await saveRiderPresence(String(row.rider_key), { help_lock_note: null, help_lock_order_id: null });
    await supabase.from('order_messages').insert({
      order_id: row.order_id,
      actor: 'system',
      kind: 'system',
      body: 'Depósito registrado. Ya puedes volver a recibir pedidos.',
    });
    return { ok: true, decision, kitchenPay: 0, debt: 0 };
  }
  if (String(row.kind || '') === 'door_missing') {
    return resolveDoorMissing(supabase, row, decision);
  }
  const kind = String(row.kind || '') as HelpKind;
  const pay: HelpPay = row.pay_method === 'cash' ? 'cash' : 'card';
  const food = Number(row.food_mxn || 0);
  let kitchenPay = Number(row.rider_due_mxn || 0);
  let debt = 0;
  let code = typeof row.payout_code === 'string' ? row.payout_code : null;
  if (kind === 'moto' && decision === 'approved' && Number(row.rider_due_mxn || 0) === 0) kitchenPay = 0;
  if (decision === 'rejected') debt = falseReportDebt(pay, food);
  if (kitchenPay > 0 && !code) code = payoutCode();
  const lockText =
    debt > 0
      ? riderLockCopy({ kind: 'moto', code: null, kitchenPay: 0, debt, food })
      : decision === 'approved' && (kind === 'moto' || kind === 'unsafe')
        ? ''
        : String(row.note || '');
  const updated = await supabase
    .from('rider_help_reports')
    .update({
      resolution: decision,
      phase: 'resolved',
      rider_due_mxn: kitchenPay,
      payout_code: code,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (updated.error) throw new Error(updated.error.message);
  if (debt > 0) {
    await saveRiderPresence(String(row.rider_key), {
      help_lock_note: lockText,
      help_lock_order_id: row.order_id,
      rider_active: false,
    });
    await supabase.from('order_messages').insert({
      order_id: row.order_id,
      actor: 'system',
      kind: 'system',
      body: lockText,
    });
  } else if (row.lock_until === 'resolve') {
    await saveRiderPresence(String(row.rider_key), { help_lock_note: null, help_lock_order_id: null });
  }
  if (code && kitchenPay > 0) {
    await supabase.from('orders').update({ help_code: code }).eq('id', row.order_id);
    await supabase.from('order_messages').insert({
      order_id: row.order_id,
      actor: 'system',
      kind: 'system',
      body: riderLockCopy({ kind, code, kitchenPay, debt: 0, food }),
    });
  }
  void notifyIangelHelp({
    reportId,
    externalId: String(row.order_id),
    kind,
    label: HELP_LABELS[kind] || kind,
    phase: 'resolved',
    payMethod: pay,
    foodMxn: food,
    riderDueMxn: kitchenPay,
    customerDueMxn: Number(row.customer_due_mxn || 0),
    note: String(row.note || ''),
    payoutCode: code,
    resolution: decision,
    detail: lockText,
  }).catch(() => undefined);
  return { ok: true, decision, kitchenPay, debt };
}

export function refundStillOpen(createdAt: string | null | undefined, now = Date.now()) {
  const started = Date.parse(String(createdAt || ''));
  if (!Number.isFinite(started)) return false;
  return now - started <= REFUND_WINDOW_MS;
}

/** Cocina y admin votan por separado. El crédito se crea solo si los dos aceptan. */
export async function decideIncompleteRefund(
  supabase: SupabaseClient,
  reportId: string,
  actor: 'kitchen' | 'admin',
  decision: 'approved' | 'rejected',
  reason = ''
) {
  const found = await supabase.from('rider_help_reports').select('*').eq('id', reportId).maybeSingle();
  if (found.error) throw new Error(found.error.message);
  const row = found.data;
  if (!row || String(row.kind) !== 'incomplete') throw new Error('Este caso no es un pedido incompleto');
  if (row.resolution === 'rejected' || row.resolution === 'credit') throw new Error('Ese caso ya quedó cerrado');
  if (!String(row.customer_note || '').trim()) throw new Error('El cliente aún no solicita el reembolso');
  if (row.refund_credit_mxn) throw new Error('Ese crédito ya quedó aplicado');
  const column = actor === 'kitchen' ? 'kitchen_refund' : 'admin_refund';
  if (row[column]) throw new Error('Esa revisión ya quedó registrada');
  const note = reason.trim().slice(0, 240);
  const other = actor === 'kitchen' ? row.admin_refund : row.kitchen_refund;
  const order = await supabase
    .from('orders')
    .select('id, customer_phone, customer_name, pay_method, cash_food_due, total_charged, delivery_fee, customer_fee, short_code, created_at')
    .eq('id', row.order_id)
    .maybeSingle();
  if (order.error) throw new Error(order.error.message);
  if (!refundStillOpen(order.data?.created_at)) throw new Error('Pasaron más de 48 horas desde el pedido');

  if (decision === 'rejected') {
    const saved = await supabase
      .from('rider_help_reports')
      .update({
        [column]: 'rejected',
        resolution: 'rejected',
        phase: 'resolved',
        refund_note: note || 'Rechazado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);
    if (saved.error) throw new Error(saved.error.message);
    const who = actor === 'kitchen' ? 'Cocina' : 'Admin';
    await supabase.from('order_messages').insert({
      order_id: row.order_id,
      actor: 'system',
      kind: 'system',
      body: `${who} rechazó el reembolso. ${note || 'Sin crédito en la próxima compra.'}`,
    });
    await supabase
      .from('orders')
      .update({ help_label: REFUND_REJECTED_LABEL })
      .eq('id', row.order_id);
    return { ok: true, closed: true, creditMxn: 0 };
  }

  if (other !== 'approved') {
    const saved = await supabase
      .from('rider_help_reports')
      .update({ [column]: 'approved', updated_at: new Date().toISOString() })
      .eq('id', reportId);
    if (saved.error) throw new Error(saved.error.message);
    return { ok: true, closed: false, creditMxn: 0 };
  }

  const pay: HelpPay = order.data?.pay_method === 'cash' ? 'cash' : 'card';
  const credit = incompleteRefundCredit({
    pay,
    cashFood: Number(order.data?.cash_food_due || row.food_mxn || 0),
    total: Number(order.data?.total_charged || 0),
    delivery: Number(order.data?.delivery_fee || 0),
    service: Number(order.data?.customer_fee || 0),
  });
  if (credit <= 0) throw new Error('Ese pedido no tiene un monto para acreditar');
  const phone = normalizePhone(String(order.data?.customer_phone || ''));
  if (phone.length < 10) throw new Error('El pedido no tiene teléfono para el crédito');
  const prior = await supabase
    .from('customer_pending_balances')
    .select('id')
    .eq('source_order_id', row.order_id)
    .eq('label', 'Crédito por pedido incompleto')
    .limit(1);
  if (prior.error) throw new Error(prior.error.message);
  if ((prior.data || []).length === 0) {
    const inserted = await supabase.from('customer_pending_balances').insert({
      phone,
      source_order_id: row.order_id,
      label: 'Crédito por pedido incompleto',
      amount_mxn: -credit,
      status: 'open',
    });
    if (inserted.error) throw new Error(inserted.error.message);
  }
  const saved = await supabase
    .from('rider_help_reports')
    .update({
      [column]: 'approved',
      resolution: 'credit',
      phase: 'resolved',
      refund_credit_mxn: credit,
      refund_note: 'Comida + envío en la próxima compra',
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);
  if (saved.error) throw new Error(saved.error.message);
  await supabase.from('order_messages').insert({
    order_id: row.order_id,
    actor: 'system',
    kind: 'system',
    body: `Reembolso aceptado. ${credit} pesos de comida y envío quedan en tu próxima compra.`,
  });
  await supabase
    .from('orders')
    .update({ help_label: REFUND_ACCEPTED_LABEL })
    .eq('id', row.order_id);
  return { ok: true, closed: true, creditMxn: credit };
}

export async function listHelpReports(supabase: SupabaseClient) {
  const found = await supabase.from('rider_help_reports').select('*').order('created_at', { ascending: false }).limit(80);
  if (found.error) throw new Error(found.error.message);
  return found.data || [];
}
