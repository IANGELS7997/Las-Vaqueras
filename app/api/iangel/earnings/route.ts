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
};

function tripAmount(row: DeliveredRow) {
  const fee = Number(row.self_fee ?? row.delivery_fee ?? SELF_FEE_MXN);
  return Number.isFinite(fee) && fee > 0 ? fee : SELF_FEE_MXN;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeekMonday(d: Date) {
  const day = startOfLocalDay(d);
  const dow = day.getDay(); // 0=Dom
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  day.setDate(day.getDate() + mondayOffset);
  return day;
}

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;

  const supabase = createAdminSupabase();
  const weekStart = startOfWeekMonday(new Date());
  const weekIso = weekStart.toISOString();

  const found = await supabase
    .from('orders')
    .select('id, short_code, self_fee, delivery_fee, created_at, status, dispatch_status')
    .in('delivery_provider', ['self', 'wait_self'])
    .or('status.eq.delivered,dispatch_status.eq.delivered')
    .gte('created_at', weekIso)
    .order('created_at', { ascending: false })
    .limit(80);

  if (found.error) {
    return iangelJson(req, { error: found.error.message }, 500);
  }

  const rows = (found.data || []) as DeliveredRow[];
  const todayStart = startOfLocalDay(new Date()).getTime();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      dow: d.getDay(),
      label: DAY_LABELS[d.getDay()],
      trips: 0,
      earnings: 0,
      key: d.toDateString(),
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
    if (at.getTime() >= todayStart) {
      todayTrips += 1;
      todayEarnings += amount;
    }
    const bucket = days.find((day) => day.key === at.toDateString());
    if (bucket) {
      bucket.trips += 1;
      bucket.earnings += amount;
    }
  }

  return iangelJson(req, {
    trips: todayTrips,
    earnings: todayEarnings,
    fee: SELF_FEE_MXN,
    today: { trips: todayTrips, earnings: todayEarnings },
    week: {
      trips: weekTrips,
      earnings: weekEarnings,
      days: days.map(({ dow, label, trips, earnings }) => ({ dow, label, trips, earnings })),
    },
    recent: rows.slice(0, 20).map((row) => ({
      id: row.id,
      shortCode: row.short_code,
      at: row.created_at,
      amount: tripAmount(row),
    })),
  });
}
