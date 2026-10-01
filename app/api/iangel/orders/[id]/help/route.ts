import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, requireIangel, riderKeyFromRequest } from '@/lib/iangel-auth';
import { mapIangelOrder } from '@/lib/iangel-order';
import { saveHelpEvidence, submitRiderHelp } from '@/lib/rider-help-store';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const riderKey = riderKeyFromRequest(req) || ANGEL_RIDER_KEY;
  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    step?: string;
    note?: string;
    evidence?: string;
    policeReport?: string;
  };
  const supabase = createAdminSupabase();
  const found = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!found.data) return iangelJson(req, { error: 'Pedido no encontrado' }, 404);
  const row = found.data as Record<string, unknown>;
  const owner = String(row.iangel_rider_key || '').trim();
  if (owner && owner !== riderKey) return iangelJson(req, { error: 'Este pedido lo lleva el otro rider' }, 409);
  try {
    const evidencePath = body.evidence ? await saveHelpEvidence(supabase, params.id, body.evidence) : '';
    const saved = await submitRiderHelp(supabase, row, riderKey, {
      kind: String(body.kind || ''),
      step: String(body.step || ''),
      note: String(body.note || ''),
      evidencePath,
      policeReport: String(body.policeReport || ''),
    });
    return iangelJson(req, {
      ok: true,
      label: saved.label,
      code: saved.code,
      amount: saved.amount,
      message: saved.message,
      order: mapIangelOrder(saved.order as Record<string, unknown>),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo reportar';
    return iangelJson(req, { error: message }, 400);
  }
}
