import { ANGEL_RIDER_KEY, iangelJson, iangelPreflight, issueIangelToken } from '@/lib/iangel-auth';
import { identifyRiderAccessToken } from '@/lib/iangel-ops';
import { saveRiderPresence } from '@/lib/iangel-presence';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string; accessToken?: string };
  const accessToken = String(body.accessToken || '').trim();
  if (accessToken) {
    const rider = await identifyRiderAccessToken(accessToken);
    if (!rider) return iangelJson(req, { error: 'Teléfono o contraseña incorrectos' }, 401);
    await saveRiderPresence(rider.id, { display_name: rider.displayName }).catch(() => undefined);
    return iangelJson(req, { token: issueIangelToken(rider.id), name: rider.displayName });
  }

  const password = String(body.password || '');
  const expected = process.env.IANGEL_RIDER_PASSWORD || '';
  if (!expected || password !== expected) {
    return iangelJson(req, { error: 'Contraseña incorrecta' }, 401);
  }
  await saveRiderPresence(ANGEL_RIDER_KEY, { display_name: 'Angel' }).catch(() => undefined);
  return iangelJson(req, { token: issueIangelToken(ANGEL_RIDER_KEY), name: 'Angel' });
}
