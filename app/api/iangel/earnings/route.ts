import { SELF_FEE_MXN } from '@/lib/iangel-constants';
import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type DeliveredRow = {
  id: string;
  short_code: string | null;
  self_fee: number | null;
  delivery_fee: number | null;
  created_at: string;
  status: string;
  dispatch_status: string | null;
  customer_name: string | null;
  delivery_address: string | null;
  delivery_references: string | null;
  leave_at_door: boolean | null;
  gated_community: boolean | null;
  total_charged: number | null;
  items: unknown;
};

function tripAmount(row: DeliveredRow) {
  const fee = Number(row.self_fee ?? row.delivery_fee ?? SELF_FEE_MXN);
  return Number.isFinite(fee) && fee > 0 ? fee : SELF_FEE_MXN;
}

/** Día civil en Chihuahua (Vercel corre en UTC). */
function chihuahuaYmd(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chihuahua',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { y, m, day };
}

function startOfWeekMonday(d: Date) {
  const { y, m, day } = chihuahuaYmd(d);
  // Mediodía UTC del día civil para calcular DOW sin desfase
  const noon = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
  const dow = noon.getUTCDay(); // 0=Dom
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(noon);
  monday.setUTCDate(noon.getUTCDate() + mondayOffset);
  // Lunes 00:00 America/Chihuahua ≈ UTC-6
  return new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 6, 0, 0));
}

function customerNotes(raw: unknown): string | null {
  const text = String(raw || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^Ubicaci[oó]n:/i.test(line))
    .join('\n')
    .trim();
  return text || null;
}

function asItems(raw: unknown): { name: string; qty: number }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { name?: unknown; qty?: unknown; quantity?: unknown };
      const name = String(row.name || '').trim();
      const qty = Number(row.qty ?? row.quantity ?? 1);
      if (!name) return null;
      return { name, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 };
    })
    .filter((item): item is { name: string; qty: number } => Boolean(item));
}

function formatDateMx(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Chihuahua',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  return `${day}/${month}/${year}`;
}

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const weekOffset = Math.max(-52, Math.min(0, Number(url.searchParams.get('weekOffset') || 0) || 0));

  const supabase = createAdminSupabase();
  const weekStart = startOfWeekMonday(new Date());
  weekStart.setUTCDate(weekStart.getUTCDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7); // lunes siguiente (exclusivo)
  const weekIso = weekStart.toISOString();
  const weekEndIso = weekEnd.toISOString();

  const found = await supabase
    .from('orders')
    .select(
      'id, short_code, self_fee, delivery_fee, created_at, status, dispatch_status, customer_name, delivery_address, delivery_references, leave_at_door, gated_community, total_charged, items'
    )
    .in('delivery_provider', ['self', 'wait_self'])
    .or('status.eq.delivered,dispatch_status.eq.delivered')
    .gte('created_at', weekIso)
    .lt('created_at', weekEndIso)
    .order('created_at', { ascending: false })
    .limit(120);

  if (found.error) {
    return iangelJson(req, { error: found.error.message }, 500);
  }

  const rows = (found.data || []) as DeliveredRow[];
  const todayYmd = chihuahuaYmd();
  const todayStart = new Date(Date.UTC(todayYmd.y, todayYmd.m - 1, todayYmd.day, 6, 0, 0)).getTime();
  const isCurrentWeek = weekOffset === 0;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const ymd = chihuahuaYmd(d);
    const noon = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.day, 12, 0, 0));
    return {
      dow: noon.getUTCDay(),
      label: DAY_LABELS[noon.getUTCDay()],
      trips: 0,
      earnings: 0,
      key: `${ymd.y}-${ymd.m}-${ymd.day}`,
    };
  });

  let todayTrips = 0;
  let todayEarnings = 0;
  let weekTrips = 0;
  let weekEarnings = 0;

  for (const row of rows) {
    const amount = tripAmount(row);
    const at = new Date(row.created_at);
    weekTrips += 1;
    weekEarnings += amount;
    if (isCurrentWeek && at.getTime() >= todayStart) {
      todayTrips += 1;
      todayEarnings += amount;
    }
    const atYmd = chihuahuaYmd(at);
    const bucket = days.find((day) => day.key === `${atYmd.y}-${atYmd.m}-${atYmd.day}`);
    if (bucket) {
      bucket.trips += 1;
      bucket.earnings += amount;
    }
  }

  const recent = rows.map((row) => ({
    id: row.id,
    shortCode: row.short_code || String(row.id).replace(/-/g, '').slice(0, 4).toUpperCase(),
    at: row.created_at,
    amount: tripAmount(row),
    customerName: String(row.customer_name || '').trim() || null,
    address: String(row.delivery_address || '').trim() || null,
    notes: customerNotes(row.delivery_references),
    leaveAtDoor: Boolean(row.leave_at_door),
    gatedCommunity: Boolean(row.gated_community),
    total: Number(row.total_charged || 0),
    items: asItems(row.items),
    status: row.dispatch_status || row.status || 'delivered',
  }));

  return iangelJson(req, {
    trips: isCurrentWeek ? todayTrips : weekTrips,
    earnings: isCurrentWeek ? todayEarnings : weekEarnings,
    fee: SELF_FEE_MXN,
    weekOffset,
    weekRange: {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      label: `${formatDateMx(weekStart)} – ${formatDateMx(weekEnd)}`,
    },
    today: { trips: todayTrips, earnings: todayEarnings },
    week: {
      trips: weekTrips,
      earnings: weekEarnings,
      days: days.map(({ dow, label, trips, earnings }) => ({ dow, label, trips, earnings })),
    },
    recent,
  });
}
