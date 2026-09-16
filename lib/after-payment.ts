import { COPY } from '@/lib/iangel-copy';
import { mapDbOrder, type DbOrderRow } from '@/lib/orders-map';
import { notifyOrderEvent } from '@/lib/order-chat';
import { buildOrderTicketHtml, sendOrderTicketEmail } from '@/lib/order-ticket-email';
import { sendRiderPush } from '@/lib/push-vapid';

export async function afterPaymentConfirmed(row: DbOrderRow) {
  const order = mapDbOrder(row);
  const token = row.profile_login_token || '';
  const html = buildOrderTicketHtml({
    orderId: order.id,
    shortCode: order.shortCode,
    createdAt: order.createdAt,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    customerPhoneAlt: order.phoneAlt,
    deliveryAddress: order.customer.address,
    deliveryReferences: order.customer.references,
    items: order.items,
    subtotal: order.subtotal,
    serviceFee: order.serviceFee,
    deliveryFee: order.deliveryFee,
    totalCharged: order.total,
    token,
    fulfillment: order.fulfillment,
    provider: order.provider,
    cookHold: order.cookHold,
    pickupAt: order.pickupAt,
    leaveAtDoor: order.leaveAtDoor,
  });
  await sendOrderTicketEmail({
    to: order.customer.email,
    html,
    text: `Pedido #${order.shortCode || order.id.slice(0, 4)} pagado. Ver: https://lasvaqueras.com.mx/orders/${order.id}${token ? `?s=${token}` : ''}`,
  });
  await notifyOrderEvent({
    orderId: order.id,
    customerText: 'Pago confirmado. Tu pedido ya está en cocina.',
    customerPush: { title: 'Pago confirmado', body: `Pedido #${order.shortCode || 'LV'} en Las Vaqueras.` },
  });
  if (order.cookHold) {
    await notifyOrderEvent({
      orderId: order.id,
      customerText: 'Cocina en espera: se prepara cuando el rider termine el viaje actual (35–45 min).',
      riderPush: { title: 'Pedido en espera', body: `#${order.shortCode || ''} · $50 al liberar` },
    });
  }
  if (order.provider === 'self' || order.provider === 'wait_self') {
    await sendRiderPush({
      title: 'Pedido nuevo IANGEL',
      body: `#${order.shortCode || ''} · ${COPY.selfTitle}`,
      tag: 'iangel-new-order',
    });
  }
}
