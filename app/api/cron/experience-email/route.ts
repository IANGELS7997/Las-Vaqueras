import { NextResponse } from 'next/server';
import { EXPERIENCE_WAIT_MS, sendExperienceEmail } from '@/lib/experience-email';
import { sameWebhookSecret } from '@/lib/ops-webhook';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || '';
  const auth = req.headers.get('authorization') || '';
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const opsSecret = process.env.IANGEL_OPS_WEBHOOK_SECRET || '';
  const opsOk = sameWebhookSecret(req.headers.get('x-webhook-secret') || '', opsSecret);
  const bearerOk = Boolean(secret) && auth === `Bearer ${secret}`;
  if (!bearerOk && !opsOk) {
    if (secret || (process.env.VERCEL && !isVercelCron)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  const supabase = createAdminSupabase();
  const cutoff = new Date(Date.now() - EXPERIENCE_WAIT_MS).toISOString();
  const due = await supabase
    .from('orders')
    .select('id, customer_email, customer_name, profile_login_token, branch_id, short_code')
    .is('experience_email_at', null)
    .not('ticket_sent_at', 'is', null)
    .lte('ticket_sent_at', cutoff)
    .order('ticket_sent_at', { ascending: true })
    .limit(20);
  if (due.error) return NextResponse.json({ error: due.error.message }, { status: 500 });

  let sent = 0;
  for (const row of due.data || []) {
    const claimed = await supabase
      .from('orders')
      .update({ experience_email_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('experience_email_at', null)
      .select('id')
      .maybeSingle();
    if (!claimed.data) continue;
    const result = await sendExperienceEmail({
      to: String(row.customer_email || ''),
      customerName: String(row.customer_name || ''),
      orderId: row.id,
      token: row.profile_login_token,
      branchId: row.branch_id,
    });
    if (!result.ok) {
      await supabase.from('orders').update({ experience_email_at: null }).eq('id', row.id);
      continue;
    }
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
