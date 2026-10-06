import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';
import { branchMailLine } from '@/lib/branches';
import { billingMailButton, billingMailText } from '@/lib/billing-form';
import { customerCopyBcc, customerMailButtons, customerMailLinksText, customerOrderUrl } from '@/lib/customer-mail';
import { sequenceIangelOps, type IangelOpsRow } from '@/lib/iangel-ops';
import { RESTAURANT_INFO } from '@/lib/restaurant';

const SITE = 'https://lasvaqueras.com.mx';
const HEADING = new Set(['picked_up', 'en_route']);
const CLOSED = new Set(['delivered', 'cancelled', 'incident', 'delivered_unclaimed']);

export const ENROUTE_SUBJECT = 'Tu pedido va en camino · Las Vaqueras';
export const ENROUTE_LINE = 'Tu pedido va en camino, el repartidor llegará pronto a tu domicilio.';

export type EnrouteCandidate = {
  id: string;
  dispatchStatus?: string | null;
  enrouteEmailAt?: string | null;
  fulfillment?: string | null;
  email?: string | null;
};

/** La siguiente puerta, solo si ya salió de tienda y todavía no se le avisó. */
export function nextDoorForEnroute(routeOrder: string[], rows: EnrouteCandidate[]): EnrouteCandidate | null {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered = routeOrder.length > 0 ? routeOrder : rows.map((row) => row.id);
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = byId.get(id);
    if (!row) continue;
    if (String(row.fulfillment || '') === 'pickup') continue;
    const dispatch = String(row.dispatchStatus || '');
    if (CLOSED.has(dispatch)) continue;
    if (!HEADING.has(dispatch)) return null;
    if (row.enrouteEmailAt) return null;
    const email = String(row.email || '').trim();
    if (!email.includes('@')) return null;
    return row;
  }
  return null;
}

function esc(value: unknown) {
  return String(value == null ? '' : value)
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;');
}

export function buildEnrouteEmail(input: {
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
}) {
  const track = customerOrderUrl(input.orderId, input.token);
  const first = esc(input.customerName.trim().split(' ')[0] || '');
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;line-height:1.45;">
<img src="${SITE}/logo-vaqueras.png" alt="Las Vaqueras" width="120" style="display:block;margin:0 auto 16px;" />
<h1 style="font-size:20px;text-align:center;color:#ea580c;">Tu pedido va en camino</h1>
<p>Hola ${first},</p>
<p>${esc(ENROUTE_LINE)}</p>
${customerMailButtons(track)}
${billingMailButton()}
<p>${branchMailLine(input.branchId)}</p>
</div>`;
  const text = `Hola ${input.customerName.trim().split(' ')[0] || ''}. ${ENROUTE_LINE} ${customerMailLinksText(track)} ${billingMailText()}`;
  return { subject: ENROUTE_SUBJECT, html, text };
}

export async function sendEnrouteEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  token?: string | null;
  branchId?: unknown;
}) {
  const key = process.env.RESEND_API_KEY || '';
  const to = input.to.trim();
  if (!key || !to.includes('@')) return { ok: false as const };
  const message = buildEnrouteEmail(input);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Las Vaqueras <noreply@lasvaqueras.com.mx>',
      to: [to],
      ...(customerCopyBcc(to) ? { bcc: customerCopyBcc(to) } : {}),
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  return { ok: response.ok };
}

type QueueRow = IangelOpsRow & {
  customer_email?: string | null;
  enroute_email_at?: string | null;
  profile_login_token?: string | null;
};

/** Avisa a la siguiente puerta. Un fallo no frena al rider. */
export async function notifyNextDoorEnroute(supabase: SupabaseClient) {
  try {
    const queued = await supabase
      .from('orders')
      .select(
        'id, created_at, dropoff_lat, dropoff_lng, delivery_provider, fulfillment_type, dispatch_status, customer_name, customer_email, enroute_email_at, profile_login_token'
      )
      .in('delivery_provider', ['self', 'wait_self'])
      .in('status', ['pending', 'preparing', 'in_transit'])
      .order('created_at', { ascending: true })
      .limit(20);
    if (queued.error || !queued.data) return;

    const rows = (queued.data as QueueRow[]).filter((row) => {
      const dispatch = String(row.dispatch_status || '');
      return dispatch !== 'delivered' && dispatch !== 'incident';
    });
    const here = { lat: RESTAURANT_INFO.pickupLat, lng: RESTAURANT_INFO.pickupLng };
    const planned = await sequenceIangelOps(here, rows);
    const routeOrder = planned?.orderIds?.length ? planned.orderIds : rows.map((row) => row.id);
    const next = nextDoorForEnroute(
      routeOrder,
      rows.map((row) => ({
        id: row.id,
        dispatchStatus: row.dispatch_status,
        enrouteEmailAt: row.enroute_email_at,
        fulfillment: row.fulfillment_type,
        email: row.customer_email,
      }))
    );
    if (!next) return;

    const claim = await supabase
      .from('orders')
      .update({ enroute_email_at: new Date().toISOString() })
      .eq('id', next.id)
      .is('enroute_email_at', null)
      .select('id, customer_name, customer_email, profile_login_token, branch_id')
      .maybeSingle();
    if (claim.error || !claim.data) return;

    const saved = claim.data as {
      id: string;
      customer_name?: string | null;
      customer_email?: string | null;
      profile_login_token?: string | null;
    };
    try {
      const sent = await sendEnrouteEmail({
        to: String(saved.customer_email || ''),
        customerName: String(saved.customer_name || ''),
        orderId: saved.id,
        token: saved.profile_login_token,
        branchId: (saved as { branch_id?: string | null }).branch_id,
      });
      if (!sent.ok) {
        await supabase.from('orders').update({ enroute_email_at: null }).eq('id', saved.id);
      }
    } catch (err) {
      Sentry.captureException(err);
      await supabase.from('orders').update({ enroute_email_at: null }).eq('id', saved.id);
    }
  } catch (err) {
    Sentry.captureException(err);
  }
}
