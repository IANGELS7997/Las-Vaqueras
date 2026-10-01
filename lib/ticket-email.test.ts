import { INSTALL_APP_URL, customerMailButtons, customerOrderUrl } from './customer-mail';
import { buildTicketEmail } from './ticket-email';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const orderUrl = customerOrderUrl('pedido-1', 'token secreto');
check(orderUrl.includes('pedido-1'), 'el enlace lleva el pedido');
check(orderUrl.includes('token%20secreto'), 'el token va codificado');

const buttons = customerMailButtons(orderUrl);
check(buttons.includes('Ver mi pedido'), 'el correo tiene ver mi pedido');
check(buttons.includes('Agregar app al inicio'), 'el correo tiene agregar app');
check(buttons.includes(INSTALL_APP_URL), 'el boton abre la pagina de instalar');
check(buttons.includes('pedido=pedido-1'), 'instalar entra con el mismo pedido');
check(buttons.includes('token+secreto'), 'instalar entra con la misma sesion');

const ticket = buildTicketEmail({
  id: 'abc-def',
  stripe_payment_intent_id: null,
  restaurant_id: null,
  customer_name: 'Ana Lopez',
  customer_phone: '6140000000',
  customer_email: 'ana@correo.com',
  delivery_address: 'Calle 1',
  delivery_references: null,
  total_charged: 120,
  restaurant_payout: 80,
  platform_fee: 10,
  customer_fee: 0,
  delivery_fee: 50,
  status: 'pending',
  items: [{ uid: '1', menuItemId: 'p', name: 'Papas', image: '', price_base: 70, quantity: 2, selections: [] }],
  created_at: new Date().toISOString(),
  fulfillment_type: 'delivery',
  short_code: 'A1B2',
  profile_login_token: 'abc',
});

check(ticket.subject.includes('#A1B2'), 'el asunto lleva el folio');
check(ticket.html.includes('Ver mi pedido'), 'el ticket tiene ver mi pedido');
check(ticket.html.includes('Agregar app al inicio'), 'el ticket tiene agregar app');
check(ticket.html.includes('2× Papas'), 'el ticket lista el platillo');
check(!ticket.html.includes('Pago al restaurante'), 'el ticket no muestra el pago al restaurante');
check(!ticket.html.includes('Fee de plataforma'), 'el ticket no muestra el fee interno');
check(ticket.text.includes(INSTALL_APP_URL), 'el texto incluye instalar');

console.log('ticket-email tests: ok');
