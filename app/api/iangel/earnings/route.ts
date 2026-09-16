import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  return iangelJson(req, { trips: 0, earnings: 0 });
}
