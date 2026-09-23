import { IANGEL_SLUG } from '@/lib/iangel-constants';
import { getOrCreateRider, type RiderRow } from '@/lib/iangel-state';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const RIDER_EMOJIS = ['🛵', '😇', '⚡', '🔥', '💪', '🌟', '🚀', '😎', '🫡', '🏆'] as const;

export type RiderProfilePublic = {
  id: string;
  name: string;
  emoji: string;
  avatarUrl: string | null;
  active: boolean;
  uberDirect: boolean;
};

export type RiderRatingRow = {
  id: string;
  orderId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
  orderCode: string | null;
  customerName: string | null;
};

export function riderAvatarPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/iangel-avatars/${path}`;
}

export function mapRiderProfile(rider: RiderRow & { avatar_path?: string | null; emoji?: string | null }): RiderProfilePublic {
  return {
    id: rider.id,
    name: rider.display_name || 'IANGEL',
    emoji: (rider.emoji && String(rider.emoji).trim()) || '🛵',
    avatarUrl: riderAvatarPublicUrl(rider.avatar_path),
    active: rider.rider_active === true,
    uberDirect: rider.uber_direct_enabled === true,
  };
}

export async function listRiderCustomerRatings(limit = 40): Promise<{
  average: number | null;
  count: number;
  ratings: RiderRatingRow[];
}> {
  const supabase = createAdminSupabase();
  const rated = await supabase
    .from('order_ratings')
    .select('id, order_id, stars, comment, created_at')
    .eq('direction', 'customer_to_rider')
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 2, 40));

  if (rated.error) throw new Error(rated.error.message);
  const rows = rated.data || [];
  if (!rows.length) return { average: null, count: 0, ratings: [] };

  const orderIds = Array.from(new Set(rows.map((row) => String(row.order_id))));
  const orders = await supabase
    .from('orders')
    .select('id, short_code, customer_name, delivery_provider')
    .in('id', orderIds)
    .in('delivery_provider', ['self', 'wait_self']);

  if (orders.error) throw new Error(orders.error.message);
  const byId = new Map((orders.data || []).map((order) => [String(order.id), order]));

  const ratings: RiderRatingRow[] = [];
  for (const row of rows) {
    const order = byId.get(String(row.order_id));
    if (!order) continue;
    ratings.push({
      id: String(row.id),
      orderId: String(row.order_id),
      stars: Number(row.stars) || 0,
      comment: typeof row.comment === 'string' ? row.comment : null,
      createdAt: String(row.created_at),
      orderCode: order.short_code ? String(order.short_code) : null,
      customerName: order.customer_name ? String(order.customer_name) : null,
    });
    if (ratings.length >= limit) break;
  }

  const count = ratings.length;
  const average =
    count > 0 ? Math.round((ratings.reduce((sum, item) => sum + item.stars, 0) / count) * 10) / 10 : null;

  return { average, count, ratings };
}

export async function getRiderProfileBundle() {
  const rider = await getOrCreateRider();
  const ratings = await listRiderCustomerRatings();
  return {
    rider: mapRiderProfile(rider),
    ratings,
    slug: IANGEL_SLUG,
  };
}
