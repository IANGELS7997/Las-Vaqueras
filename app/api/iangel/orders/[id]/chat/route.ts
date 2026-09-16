import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();
  const messages = await supabase
    .from('order_messages')
    .select('id, body, actor, created_at')
    .eq('order_id', params.id)
    .order('created_at', { ascending: true });
  return iangelJson(req, {
    messages: messages.data || [],
    quick: ['Voy en camino', 'Estoy afuera'],
  });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text || '').trim();
  if (!text) return iangelJson(req, { error: 'Mensaje vacío' }, 400);
  const supabase = createAdminSupabase();
  await supabase.from('order_messages').insert({
    order_id: params.id,
    actor: 'rider',
    kind: text === 'Voy en camino' || text === 'Estoy afuera' ? 'quick' : 'text',
    body: text,
  });
  return iangelJson(req, { ok: true });
}
