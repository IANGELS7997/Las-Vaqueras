import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendCustomerOrderPush, sendRiderPush } from '@/lib/push-vapid';

export async function addSystemMessage(orderId: string, body: string) {
  const supabase = createAdminSupabase();
  await supabase.from('order_messages').insert({
    order_id: orderId,
    actor: 'system',
    kind: 'system',
    body,
  });
}

export async function notifyOrderEvent(input: {
  orderId: string;
  customerText: string;
  riderText?: string;
  customerPush?: { title: string; body: string };
  riderPush?: { title: string; body: string };
}) {
  await addSystemMessage(input.orderId, input.customerText);
  if (input.customerPush) {
    await sendCustomerOrderPush(input.orderId, {
      ...input.customerPush,
      url: `/orders/${input.orderId}`,
    });
  }
  if (input.riderPush) {
    await sendRiderPush({
      ...input.riderPush,
      url: '/',
    });
  }
}

export const CUSTOMER_QUICK_REPLIES = [
  'Estoy saliendo',
  'Estoy abajo',
  '¿Cuánto falta?',
  'Dejar en la puerta, por favor',
];

export const RIDER_QUICK_REPLIES = [
  'Voy en camino',
  'Estoy aquí',
  'No encuentro la entrada',
  'En unos minutos llego',
];
