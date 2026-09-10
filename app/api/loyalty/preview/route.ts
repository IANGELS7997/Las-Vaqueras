import { NextResponse } from 'next/server';
import { readCustomerIdFromRequest } from '@/lib/customer-auth';
import { clientIp, loyaltyLabel, paidOrderOrdinal } from '@/lib/loyalty';
import { countPaidOrders, findCustomerIdByPhone, resolveLoyaltyKind } from '@/lib/loyalty-guard';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = typeof body.phone === 'string' ? body.phone : '';
  const email = typeof body.email === 'string' ? body.email : '';
  const address = typeof body.address === 'string' ? body.address : '';
  const isPickup = body.fulfillment === 'pickup';

  const supabase = createAdminSupabase();
  const cookieCustomerId = await readCustomerIdFromRequest();
  const customerId = (await findCustomerIdByPhone(supabase, phone)) || cookieCustomerId;
  const paid = customerId ? await countPaidOrders(supabase, customerId) : 0;
  const ordinal = paidOrderOrdinal(paid);
  const kind = await resolveLoyaltyKind({
    supabase,
    customerId,
    phone,
    email,
    ip: clientIp(req.headers),
    address,
    isPickup,
    cookieCustomerId,
  });

  return NextResponse.json({
    paidOrders: paid,
    nextOrdinal: ordinal,
    kind,
    label:
      kind === 'tenth_jumbo'
        ? `${loyaltyLabel(kind)}. Agrega Papas Jumbo: van de regalo.`
        : loyaltyLabel(kind),
    cycleLabel: `Pedido ${ordinal} de 10`,
    upcoming: [
      { at: 1, text: '30% en comida' },
      { at: 5, text: '20% en comida' },
      { at: 10, text: 'Papas Jumbo de regalo' },
    ].map((item) => ({ ...item, done: paid >= item.at, current: ordinal === item.at })),
  });
}
