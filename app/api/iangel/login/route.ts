import { iangelJson, iangelPreflight, issueIangelToken } from '@/lib/iangel-auth';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = String(body.password || '');
  const expected = process.env.IANGEL_RIDER_PASSWORD || '';
  if (!expected || password !== expected) {
    return iangelJson(req, { error: 'Contraseña incorrecta' }, 401);
  }
  return iangelJson(req, { token: issueIangelToken() });
}
