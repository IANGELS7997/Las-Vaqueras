import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';
import { sendArrivalEmail } from '@/lib/arrival-email';
import { sendEnrouteEmail } from '@/lib/enroute-email';
import { KITCHEN_ORDER_STATUSES, mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { patchFromKitchenStatus } from '@/lib/order-lifecycle';
import type { OrderStatus } from '@/types';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { orderBranchId } from '@/lib/branches';
import { requireKitchenBranch } from '@/lib/kitchen-guard';
import { kitchenCashPatch, cashViewFromRow } from '@/lib/iangel-cash';
import { closeIangelOpsOrder, syncIangelOpsKitchen, type IangelOpsRow } from '@/lib/iangel-ops';
import { closeDeliveredWithFee } from '@/lib/iangel-rider-fee';
import { dropUncollectedCashFee } from '@/lib/cash-platform-fee-store';
import { kitchenHandoff } from '@/lib/kitchen-handoff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const branch = await requireKitchenBranch();
  if (branch instanceof NextResponse) return branch;

  const body = await req.json().catch(() => ({}));
  const status = body.status as string | undefined;
  const cookHold = typeof body.cookHold === 'boolean' ? body.cookHold : undefined;
  const riderPaidCash = typeof body.riderPaidCash === 'boolean' ? body.riderPaidCash : undefined;
  const kitchenReceivedCash = typeof body.kitchenReceivedCash === 'boolean' ? body.kitchenReceivedCash : undefined;
  const release = body.release === true;
  const managedStep = body.managedStep === 'depart' || body.managedStep === 'arrive' ? body.managedStep : undefined;

  if (status !== undefined && !KITCHEN_ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 400 });
  }
  if (
    status === undefined &&
    cookHold === undefined &&
    riderPaidCash === undefined &&
    kitchenReceivedCash === undefined &&
    !release &&
    !managedStep
  ) {
    return NextResponse.json({ error: 'sin cambios' }, { status: 400 });
  }

  const supabase = createAdminSupabase();
  const current = await supabase.from('orders').select('*').eq('id', params.id).maybeSingle();
  if (!current.data || orderBranchId(current.data.branch_id) !== branch) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (riderPaidCash !== undefined || kitchenReceivedCash !== undefined) {
    try {
      Object.assign(
        patch,
        kitchenCashPatch(cashViewFromRow(current.data as Record<string, unknown>), {
          riderPaidCash,
          kitchenReceivedCash,
        })
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo marcar el efectivo';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (cookHold !== undefined) {
    patch.cook_hold = cookHold;
    if (cookHold) {
      patch.dispatch_status = 'cook_hold';
    } else if (String(current.data.dispatch_status || '') === 'cook_hold') {
      const fulfillment = current.data.fulfillment_type === 'pickup' ? 'pickup' : 'delivery';
      patch.dispatch_status = fulfillment === 'pickup' ? null : 'self_iangel';
    }
  }

  if (release) {
    const decision = kitchenHandoff({
      fulfillment: current.data.fulfillment_type,
      deliveryProvider: current.data.delivery_provider,
      status: current.data.status,
      payMethod: current.data.pay_method,
      riderPaidCash: current.data.rider_paid_cash === true,
      kitchenReceivedCash: current.data.kitchen_received_cash === true,
      pickupPhotoAt: current.data.pickup_photo_at,
      kitchenReleasedAt: current.data.kitchen_released_at,
    });
    if (!decision.enabled || decision.effect !== 'release') {
      return NextResponse.json({ error: 'Todavía no se puede entregar este pedido' }, { status: 400 });
    }
    patch.kitchen_released_at = new Date().toISOString();
  }

  if (managedStep) {
    if (String(current.data.delivery_provider || '') !== 'managed') {
      return NextResponse.json({ error: 'Este pedido no se gestiona en cocina' }, { status: 400 });
    }
    if (managedStep === 'depart') {
      if (current.data.status === 'in_transit' || current.data.status === 'delivered') {
        return NextResponse.json({ error: 'Este pedido ya va en camino' }, { status: 400 });
      }
      patch.status = 'in_transit';
      patch.dispatch_status = 'managed';
    } else {
      if (current.data.status !== 'in_transit') {
        return NextResponse.json({ error: 'Primero entrega el pedido para ponerlo en camino' }, { status: 400 });
      }
      patch.status = 'delivered';
      patch.dispatch_status = 'delivered';
      patch.rider_status = 'idle';
    }
  }

  if (status) {
    Object.assign(
      patch,
      patchFromKitchenStatus(status as OrderStatus, {
        status: current.data.status,
        dispatchStatus:
          typeof patch.dispatch_status === 'string'
            ? patch.dispatch_status
            : current.data.dispatch_status,
        fulfillment: current.data.fulfillment_type,
        cookHold: cookHold ?? current.data.cook_hold,
        leaveAtDoor: current.data.leave_at_door,
      })
    );
  }

  const orderId = params.id;
  const updateOne = supabase.from('orders').update(patch).eq('id', orderId);
  const scoped =
    managedStep === 'depart'
      ? updateOne.in('status', ['pending', 'preparing'])
      : managedStep === 'arrive'
        ? updateOne.eq('status', 'in_transit')
        : updateOne;
  const { data, error } = await scoped.select('*').maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    if (managedStep === 'depart') {
      return NextResponse.json({ error: 'Este pedido ya va en camino' }, { status: 400 });
    }
    if (managedStep === 'arrive') {
      return NextResponse.json({ error: 'Primero entrega el pedido para ponerlo en camino' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
  }

  const prevDispatch = String(current.data.dispatch_status || '');
  const nextDispatch = String((data as DbOrderRow).dispatch_status || '');
  if (nextDispatch === 'self_iangel' && prevDispatch !== 'self_iangel') {
    const { notifyIangelNewOrder } = await import('@/lib/iangel-push');
    void notifyIangelNewOrder({
      code: (data as DbOrderRow).short_code,
      customer: (data as DbOrderRow).customer_name,
    }).catch(() => undefined);
  }

  const saved = data as DbOrderRow & {
    customer_email?: string | null;
    customer_name?: string | null;
    profile_login_token?: string | null;
    enroute_email_at?: string | null;
  };
  if (managedStep === 'depart') {
    const claimedAt = new Date().toISOString();
    const claim = await supabase
      .from('orders')
      .update({ enroute_email_at: claimedAt })
      .eq('id', orderId)
      .is('enroute_email_at', null)
      .select('customer_email, customer_name, profile_login_token, branch_id')
      .maybeSingle();
    if (claim.error) Sentry.captureException(claim.error);
    const claimed = claim.data as {
      customer_email?: string | null;
      customer_name?: string | null;
      profile_login_token?: string | null;
      branch_id?: string | null;
    } | null;
    const to = String(claimed?.customer_email || '').trim();
    if (claimed && to.includes('@')) {
      try {
        const sent = await sendEnrouteEmail({
          to,
          customerName: String(claimed.customer_name || ''),
          orderId,
          token: claimed.profile_login_token,
          branchId: claimed.branch_id,
        });
        if (!sent.ok) {
          await supabase.from('orders').update({ enroute_email_at: null }).eq('id', orderId).eq('enroute_email_at', claimedAt);
        }
      } catch (err) {
        Sentry.captureException(err);
        await supabase.from('orders').update({ enroute_email_at: null }).eq('id', orderId).eq('enroute_email_at', claimedAt);
      }
    }
  }
  if (managedStep === 'arrive') {
    const to = String(saved.customer_email || '').trim();
    if (to.includes('@')) {
      try {
        await sendArrivalEmail({
          branchId: current.data.branch_id,
          to,
          customerName: String(saved.customer_name || ''),
          orderId,
          token: saved.profile_login_token,
          managed: true,
        });
      } catch (err) {
        Sentry.captureException(err);
      }
    }
  }

  const nextStatus = String((data as DbOrderRow).status || '');
  if (nextStatus === 'delivered') {
    void closeDeliveredWithFee(data as Record<string, unknown>).catch(() => undefined);
  } else if (nextStatus === 'cancelled') {
    if (String(current.data.pay_method || '') === 'cash') {
      await dropUncollectedCashFee(supabase, params.id);
    }
    void closeIangelOpsOrder(data as DbOrderRow & IangelOpsRow, 'cancelled').catch(() => undefined);
  } else {
    void syncIangelOpsKitchen(data as DbOrderRow & IangelOpsRow).catch((err) => Sentry.captureException(err));
  }

  return NextResponse.json({ order: mapDbOrder(data as DbOrderRow) });
}
