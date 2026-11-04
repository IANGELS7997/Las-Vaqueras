import * as Sentry from '@sentry/nextjs';
import { DEVELOPER_ORDER_COPY, escMail } from '@/lib/customer-mail';
import { purchaseNoticeLines, type PurchaseNoticeRow } from '@/lib/developer-purchase-email';
import { syncIangelOpsKitchen, type IangelOpsRow } from '@/lib/iangel-ops';
import {
  kitchenActionNotices,
  kitchenNoticeLead,
  kitchenNoticeTitle,
  type KitchenNoticeKind,
} from '@/lib/kitchen-notice';
import { mailDocument, mailParagraph } from '@/lib/mail-shell';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import type { createAdminSupabase } from '@/lib/supabase-admin';
import type { Order } from '@/types';

const FROM = () => process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>';

type Client = ReturnType<typeof createAdminSupabase>;

export type KitchenAcceptResult =
  | { ok: true; already: boolean; order: Order }
  | { ok: false; status: number; error: string };

const CLOSED = new Set(['delivered', 'cancelled']);

export function buildKitchenNotice(row: PurchaseNoticeRow, kind: KitchenNoticeKind) {
  const { code, branch, lines } = purchaseNoticeLines(row);
  const lead = kitchenNoticeLead(kind, row);
  const body = [lead, '', ...lines.slice(1)];
  const title = kitchenNoticeTitle(kind);
  const text = body.join('\n');
  return {
    to: DEVELOPER_ORDER_COPY,
    subject: `${title} · #${code} · ${branch.shortName}`,
    text,
    html: mailDocument({
      eyebrow: 'Aviso interno',
      title,
      body: body.filter(Boolean).map((line) => mailParagraph(escMail(line))).join(''),
      footer: 'No es el correo del cliente.',
    }),
  };
}

export async function sendKitchenNotice(row: PurchaseNoticeRow, kind: KitchenNoticeKind) {
  const key = process.env.RESEND_API_KEY || '';
  if (!key || !row.id) return false;
  const notice = buildKitchenNotice(row, kind);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM(),
      to: [notice.to],
      subject: notice.subject,
      html: notice.html,
      text: notice.text,
    }),
  }).catch((err) => {
    Sentry.captureException(err);
    return null;
  });
  return response?.ok === true;
}

/** Entregar o finalizar. Si el correo no sale, el pedido no se deshace. */
export async function notifyKitchenTransition(input: {
  before: KitchenTransitionRow;
  after: PurchaseNoticeRow;
  managedStep?: 'depart' | 'arrive' | null;
}) {
  const notices = kitchenActionNotices({
    acceptNewlySaved: false,
    releaseNewlySaved: !input.before.kitchen_released_at && Boolean(input.after.kitchen_released_at),
    managedStep: input.managedStep,
    previousStatus: input.before.status,
    nextStatus: input.after.status,
  });
  for (const kind of notices) {
    try {
      const sent = await sendKitchenNotice(input.after, kind);
      if (!sent) Sentry.captureMessage(`Aviso de cocina no enviado: ${kind}`);
    } catch (err) {
      Sentry.captureException(err);
    }
  }
}

type KitchenTransitionRow = {
  status?: string | null;
  kitchen_released_at?: string | null;
};

/** Primera vez que cocina acepta. Si el correo falla, se puede pulsar otra vez. */
export async function commitKitchenAccept(supabase: Client, row: DbOrderRow): Promise<KitchenAcceptResult> {
  const orderId = String(row.id || '').trim();
  if (!orderId) return { ok: false, status: 404, error: 'Pedido no encontrado' };
  if (String(row.status || '') === 'awaiting_payment') {
    return { ok: false, status: 400, error: 'Este pedido todavía no está pagado' };
  }
  if (CLOSED.has(String(row.status || ''))) {
    return { ok: false, status: 400, error: 'Este pedido ya no está en curso' };
  }
  if (row.kitchen_accepted_at) {
    return { ok: true, already: true, order: mapDbOrder(row, { includeHandoffPin: true }) };
  }

  const claimedAt = new Date().toISOString();
  const claim = await supabase
    .from('orders')
    .update({ kitchen_accepted_at: claimedAt })
    .eq('id', orderId)
    .is('kitchen_accepted_at', null)
    .select('*')
    .maybeSingle();
  if (claim.error) return { ok: false, status: 500, error: claim.error.message };
  if (!claim.data) {
    const current = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (current.error) return { ok: false, status: 500, error: current.error.message };
    if (!current.data) return { ok: false, status: 404, error: 'Pedido no encontrado' };
    return { ok: true, already: true, order: mapDbOrder(current.data as DbOrderRow, { includeHandoffPin: true }) };
  }

  const saved = claim.data as DbOrderRow;
  await syncIangelOpsKitchen(saved as DbOrderRow & IangelOpsRow);
  const sent = await sendKitchenNotice(saved as PurchaseNoticeRow, 'accepted');
  if (sent) {
    return { ok: true, already: false, order: mapDbOrder(saved, { includeHandoffPin: true }) };
  }

  await supabase.from('orders').update({ kitchen_accepted_at: null }).eq('id', orderId).eq('kitchen_accepted_at', claimedAt);
  const reverted = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
  if (reverted.data) await syncIangelOpsKitchen(reverted.data as DbOrderRow & IangelOpsRow);
  return { ok: false, status: 502, error: 'No se aceptó el pedido porque el aviso no salió. Intenta de nuevo.' };
}
