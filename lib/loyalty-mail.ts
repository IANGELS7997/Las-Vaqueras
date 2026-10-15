import { escMail } from '@/lib/customer-mail';
import { countPaidOrders, findCustomerIdByPhone } from '@/lib/loyalty-guard';
import { createAdminSupabase } from '@/lib/supabase-admin';

/** Bloque ya armado para pegarlo en un correo, sin volver a consultar. */
export type LoyaltyMailGuide = {
  html: string;
  text: string;
};

export type LoyaltyGuideInput = {
  /** Pedidos pagados del perfil, el mismo conteo que Promociones. */
  paidOrders: number;
  /** Lugar de este correo en la guía, del 1 al 10. Null si este pedido queda después del décimo. */
  currentStep: number | null;
};

const PROMO_LINE = '1 · 30% en comida. 5 · 20% en comida. 10 · Papas Jumbo.';
const COMPLETED_LINE = 'Ya usaste las promos del pedido 1, 5 y 10.';

function paidCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function stepInGuide(value: number | null) {
  if (value == null || !Number.isFinite(value)) return null;
  const step = Math.floor(value);
  if (step < 1 || step > 10) return null;
  return step;
}

export function loyaltyGuideCaption(input: LoyaltyGuideInput) {
  const paid = paidCount(input.paidOrders);
  if (paid >= 10) return COMPLETED_LINE;
  const step = stepInGuide(input.currentStep);
  if (step) return `Vas en el pedido ${step}.`;
  if (paid > 0) return `Vas en el pedido ${paid}.`;
  return 'Vas en el pedido 1.';
}

function filledCount(input: LoyaltyGuideInput) {
  const paid = paidCount(input.paidOrders);
  const step = stepInGuide(input.currentStep) ?? 0;
  return Math.min(10, Math.max(Math.min(paid, 10), step));
}

function cell(step: number, filled: number, current: number | null) {
  const done = step <= filled;
  const prize = step === 1 || step === 5 || step === 10;
  const here = current === step;
  const background = done ? (prize ? '#ea580c' : '#f97316') : prize ? '#fff7ed' : '#f4f4f5';
  const color = done ? '#ffffff' : prize ? '#ea580c' : '#71717a';
  const border = here ? '3px solid #111111' : prize && !done ? '2px solid #ea580c' : '2px solid transparent';
  const size = prize ? 40 : 32;
  return `<td style="padding:4px;text-align:center;">
<div style="width:${size}px;height:${size}px;line-height:${size - 4}px;margin:0 auto;border-radius:8px;background:${background};color:${color};border:${border};font-weight:700;font-size:${prize ? 16 : 13}px;text-align:center;">${step}</div>
</td>`;
}

function row(steps: number[], filled: number, current: number | null) {
  return `<tr>${steps.map((step) => cell(step, filled, current)).join('')}</tr>`;
}

/** Guía visual 1–10. El HTML usa tabla para que se vea en el correo. */
export function loyaltyMailGuide(input: LoyaltyGuideInput): LoyaltyMailGuide {
  const current = stepInGuide(input.currentStep);
  const filled = filledCount(input);
  const caption = loyaltyGuideCaption(input);
  const marked = Array.from({ length: filled }, (_, index) => index + 1);
  const markedText = marked.length > 0 ? marked.join(', ') : 'ninguno';
  const hereText = current ? `Este correo es el pedido ${current}.` : '';
  const html = `<div style="margin:16px 0 8px;">
<p style="font-weight:700;margin:0 0 4px;">Tu guía de pedidos</p>
<p style="margin:0 0 8px;">${escMail(caption)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
${row([1, 2, 3, 4, 5], filled, current)}
${row([6, 7, 8, 9, 10], filled, current)}
</table>
<p style="font-size:12px;color:#52525b;margin:8px 0 0;text-align:center;">${escMail(PROMO_LINE)}</p>
</div>`;
  const text = [
    'Tu guía de pedidos',
    caption,
    `Pedidos marcados: ${markedText}.`,
    hereText,
    PROMO_LINE,
  ]
    .filter(Boolean)
    .join('\n');
  return { html, text };
}

/** El lugar de este pedido entre los primeros 10, del más antiguo al más nuevo. */
export function loyaltyGuideFromPaidOrders(input: {
  orderId: string;
  paidOrders: number;
  firstIds: string[];
}): LoyaltyMailGuide {
  const index = input.firstIds.indexOf(input.orderId);
  const currentStep = index >= 0 && index < 10 ? index + 1 : null;
  const listed = input.firstIds.length;
  const paid = input.paidOrders > 0 ? input.paidOrders : listed;
  if (paid <= 0) return loyaltyMailGuide({ paidOrders: 1, currentStep: 1 });
  return loyaltyMailGuide({ paidOrders: Math.max(paid, listed), currentStep });
}

/**
 * Si este pedido todavía no está ligado al perfil, cuenta como el siguiente.
 * No suma otra vez cuando ya está en la lista.
 */
export function loyaltyGuideForOrder(input: {
  orderId: string;
  hasProfile: boolean;
  linked: boolean;
  countsTowardGuide: boolean;
  paidOrders: number;
  firstIds: string[];
}): LoyaltyMailGuide {
  if (!input.hasProfile) return loyaltyMailGuide({ paidOrders: 1, currentStep: 1 });
  const ids = input.firstIds.slice();
  let paid = paidCount(input.paidOrders);
  const listed = ids.includes(input.orderId);
  if (!listed && !input.linked && input.countsTowardGuide) {
    paid += 1;
    if (paid <= 10) ids.push(input.orderId);
  }
  return loyaltyGuideFromPaidOrders({ orderId: input.orderId, paidOrders: paid, firstIds: ids });
}

/**
 * Misma cuenta que el perfil. Si no hay perfil, este pedido es el 1.
 * Si la consulta falla, regresa null y el correo sale sin la guía.
 */
export async function loadLoyaltyMailGuide(input: {
  orderId: string;
  customerId?: string | null;
}): Promise<LoyaltyMailGuide | null> {
  try {
    const orderId = String(input.orderId || '').trim();
    if (!orderId) return null;
    const supabase = createAdminSupabase();
    const order = await supabase
      .from('orders')
      .select('customer_id, customer_phone, status')
      .eq('id', orderId)
      .maybeSingle();
    if (order.error) return null;

    let customerId = String(input.customerId || order.data?.customer_id || '').trim();
    if (!customerId && order.data?.customer_phone) {
      customerId = (await findCustomerIdByPhone(supabase, String(order.data.customer_phone))) || '';
    }
    if (!customerId) return loyaltyMailGuide({ paidOrders: 1, currentStep: 1 });

    const status = String(order.data?.status || '');
    const paid = await countPaidOrders(supabase, customerId);
    const first = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customerId)
      .neq('status', 'awaiting_payment')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(10);
    if (first.error) return null;
    const firstIds = (first.data || []).map((row) => String(row.id || '')).filter(Boolean);
    return loyaltyGuideForOrder({
      orderId,
      hasProfile: true,
      linked: String(order.data?.customer_id || '') === customerId,
      countsTowardGuide: status !== '' && status !== 'awaiting_payment' && status !== 'cancelled',
      paidOrders: paid,
      firstIds,
    });
  } catch {
    return null;
  }
}
