import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { getRiderProfileBundle, RIDER_EMOJIS } from '@/lib/iangel-profile';
import { isIangelShift } from '@/lib/iangel-shift';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  try {
    const bundle = await getRiderProfileBundle();
    return iangelJson(req, {
      ...bundle,
      inShift: isIangelShift(),
      emojiOptions: RIDER_EMOJIS,
    });
  } catch (err) {
    return iangelJson(req, { error: err instanceof Error ? err.message : 'No se cargó el perfil' }, 500);
  }
}
