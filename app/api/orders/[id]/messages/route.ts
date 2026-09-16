import { NextResponse } from 'next/server';
import { canAccessOrder } from '@/lib/order-access';
import { CUSTOMER_QUICK_REPLIES } from '@/lib/order-chat';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendRiderPush } from '@/lib/push-vapid';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const token = new URL(req.url).searchParams.get('s');
  if (!(await canAccessOrder(params.id, token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const supabase = createAdminSupabase();
  const { data } = await supabase
    .from('order_messages')
    .select('id, actor, kind, body, created_at')
    .eq('order_id', params.id)
    .order('created_at', { ascending: true });
  return NextResponse.json({ messages: data || [], quick: CUSTOMER_QUICK_REPLIES });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { text?: string; token?: string };
  if (!(await canAccessOrder(params.id, body.token))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const text = String(body.text || '').trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
  const supabase = createAdminSupabase();
  const inserted = await supabase
    .from('order_messages')
    .insert({ order_id: params.id, actor: 'customer', kind: 'text', body: text })
    .select('*')
    .single();
  if (inserted.error) return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  await sendRiderPush({ title: 'Cliente', body: text, tag: `chat-${params.id}` });
  return NextResponse.json({ message: inserted.data });
}
