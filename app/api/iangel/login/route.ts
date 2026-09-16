import { iangelCookieOptions, iangelJson, iangelPreflight, iangelSessionToken, IANGEL_COOKIE, passwordMatches } from '@/lib/iangel-auth';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!passwordMatches(String(body.password || ''))) {
    return iangelJson(req, { error: 'Contraseña incorrecta' }, 401);
  }
  const token = await iangelSessionToken();
  if (!token) {
    return iangelJson(req, { error: 'Falta IANGEL_API_SECRET en el servidor' }, 500);
  }
  const response = iangelJson(req, { token, ok: true });
  response.cookies.set(IANGEL_COOKIE, token, iangelCookieOptions());
  return response;
}
