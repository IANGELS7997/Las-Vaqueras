import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';

export const runtime = 'nodejs';

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  return iangelJson(req, { rider: { active: true }, inShift: true, shiftCopy: null });
}

export async function PATCH(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { rider_active?: boolean };
  return iangelJson(req, { rider: { active: body.rider_active !== false } });
}
