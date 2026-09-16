import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { RIDER_QUICK_REPLIES } from '@/lib/order-chat';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendCustomerOrderPush } from '@/lib/push-vapid';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('order_messages')
    .select('id, actor, kind, body, created_at')
    .eq('order_id', params.id)
    .order('created_at', { ascending: true });
  return iangelJson(req, { messages: data || [], quick: RIDER_QUICK_REPLIES });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text || '').trim().slice(0, 500);
  if (!text) return iangelJson(req, { error: 'Mensaje vacío' }, 400);
  const supabase = createAdminSupabase();
  const inserted = await supabase
    .from('order_messages')
    .insert({ order_id: params.id, actor: 'rider', kind: 'quick', body: text })
    .select('*')
    .single();
  if (inserted.error) return iangelJson(req, { error: inserted.error.message }, 500);
  await sendCustomerOrderPush(params.id, { title: 'IANGEL', body: text, url: `/orders/${params.id}` });
  return iangelJson(req, { message: inserted.data });
}
