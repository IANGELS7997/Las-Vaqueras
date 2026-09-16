import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { runIangelAction } from '@/lib/iangel-actions';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pin?: string;
    lat?: number;
    lng?: number;
    photoPath?: string;
    incidentType?: string;
    incidentNote?: string;
    stars?: number;
    comment?: string;
    accessOk?: boolean;
    noShow?: boolean;
  };
  try {
    const result = await runIangelAction({
      orderId: params.id,
      action: body.action as never,
      pin: body.pin,
      lat: body.lat,
      lng: body.lng,
      photoPath: body.photoPath,
      incidentType: body.incidentType,
      incidentNote: body.incidentNote,
      stars: body.stars,
      comment: body.comment,
      accessOk: body.accessOk,
      noShow: body.noShow,
    });
    return iangelJson(req, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar';
    return iangelJson(req, { error: message }, 400);
  }
}
