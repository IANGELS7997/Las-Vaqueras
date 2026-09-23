import { iangelJson, iangelPreflight, requireIangel } from '@/lib/iangel-auth';
import { createAdminSupabase } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type MessageRow = {
  id: string;
  order_id: string;
  body: string;
  actor: string;
  kind?: string | null;
  created_at: string;
};

const SYSTEM_TEMPLATES = [
  {
    id: 'sys-welcome',
    title: 'Bienvenida IANGEL',
    body: 'Conecta con el control de la izquierda para recibir pedidos de casa ($50).',
  },
  {
    id: 'sys-uber',
    title: 'Uber Direct',
    body: 'Activa Uber Direct en el mismo panel si quieres que Las Vaqueras cotice envíos Uber.',
  },
  {
    id: 'sys-safety',
    title: 'Seguridad',
    body: 'SOS y navegación están en el mapa. Termina o reporta el viaje antes de desconectarte.',
  },
];

export async function OPTIONS(req: Request) {
  return iangelPreflight(req);
}

export async function GET(req: Request) {
  const denied = await requireIangel(req);
  if (denied) return denied;
  const supabase = createAdminSupabase();

  const orders = await supabase
    .from('orders')
    .select('id, short_code, customer_name, dispatch_status, status, updated_at, created_at')
    .in('delivery_provider', ['self', 'wait_self'])
    .order('updated_at', { ascending: false })
    .limit(40);

  if (orders.error) {
    return iangelJson(req, { error: orders.error.message }, 500);
  }

  const orderRows = orders.data || [];
  const orderIds = orderRows.map((row) => String(row.id));
  let messages: MessageRow[] = [];

  if (orderIds.length) {
    const msg = await supabase
      .from('order_messages')
      .select('id, order_id, body, actor, kind, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: false })
      .limit(200);
    if (msg.error) {
      return iangelJson(req, { error: msg.error.message }, 500);
    }
    messages = (msg.data || []) as MessageRow[];
  }

  const latestByOrder = new Map<string, MessageRow>();
  const systemMessages: { id: string; body: string; createdAt: string; orderCode: string | null }[] = [];

  for (const message of messages) {
    const actor = String(message.actor || '');
    const kind = String(message.kind || '');
    const isSystem = actor === 'system' || kind === 'system' || actor === 'kitchen';
    const order = orderRows.find((row) => String(row.id) === String(message.order_id));
    if (isSystem) {
      systemMessages.push({
        id: String(message.id),
        body: String(message.body || ''),
        createdAt: String(message.created_at),
        orderCode: order?.short_code ? String(order.short_code) : null,
      });
      continue;
    }
    if (!latestByOrder.has(String(message.order_id))) {
      latestByOrder.set(String(message.order_id), message);
    }
  }

  const orderThreads = orderRows
    .map((order) => {
      const latest = latestByOrder.get(String(order.id));
      const status = String(order.dispatch_status || order.status || '');
      const live = ['assigned', 'picked_up', 'en_route', 'arrived', 'waiting_customer', 'self_iangel', 'cook_hold'].includes(
        status
      );
      if (!latest && !live) return null;
      return {
        id: String(order.id),
        code: order.short_code ? `#${String(order.short_code).replace(/^#/, '')}` : `#${String(order.id).slice(0, 6)}`,
        customer: order.customer_name || 'Cliente',
        preview: latest?.body || (live ? 'Pedido activo · toca para chatear' : 'Sin mensajes aún'),
        updatedAt: latest?.created_at || order.updated_at || order.created_at,
        live,
        actor: latest?.actor || 'system',
      };
    })
    .filter(Boolean);

  return iangelJson(req, {
    system: {
      templates: SYSTEM_TEMPLATES,
      messages: systemMessages.slice(0, 30),
    },
    orders: orderThreads,
  });
}
