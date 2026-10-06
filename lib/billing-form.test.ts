import { BILLING_FORM_URL, billingMailButton, billingMailText, orderCanRequestInvoice } from './billing-form';
import { buildTicketEmail } from './ticket-email';
import { buildEnrouteEmail } from './enroute-email';
import { buildArrivalEmail } from './arrival-email';
import { customerMailButtons } from './customer-mail';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

check(orderCanRequestInvoice('pending'), 'un pedido pagado puede facturar');
check(orderCanRequestInvoice('delivered'), 'un pedido entregado puede facturar');
check(orderCanRequestInvoice('cancelled'), 'un pedido cancelado ya pagado puede facturar');
check(!orderCanRequestInvoice('awaiting_payment'), 'el pago pendiente no factura');

const shared = customerMailButtons('https://lasvaqueras.com.mx/orders/1');
check(!shared.includes('Facturación'), 'los demás correos no llevan facturación');
check(!shared.includes(BILLING_FORM_URL), 'el enlace no se cuela en los botones compartidos');

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
  items: [{ uid: '1', menuItemId: 'p', name: 'Papas', image: '', price_base: 70, quantity: 1, selections: [] }],
  created_at: new Date().toISOString(),
  fulfillment_type: 'pickup',
  short_code: 'A1B2',
  profile_login_token: null,
});
check(ticket.html.includes(billingMailButton()), 'el ticket lleva el botón');
check(ticket.text.includes(billingMailText()), 'el texto del ticket lleva el enlace');

const enroute = buildEnrouteEmail({
  customerName: 'Ana Lopez',
  orderId: 'abc-def',
  branchId: 'centro',
});
check(enroute.subject.startsWith('Tu pedido va en camino'), 'el asunto de camino se conserva');
check(enroute.html.includes('Facturación'), 'el correo de camino lleva el botón');
check(enroute.text.includes(BILLING_FORM_URL), 'el texto de camino lleva el enlace');

const arrival = buildArrivalEmail({
  customerName: 'Ana Lopez',
  orderId: 'abc-def',
  leaveAtDoor: false,
  branchId: 'centro',
});
check(arrival.subject.startsWith('Tu repartidor llegó'), 'el asunto de llegada se conserva');
check(arrival.html.includes('Facturación'), 'el correo de llegada lleva el botón');
check(arrival.text.includes(BILLING_FORM_URL), 'el texto de llegada lleva el enlace');

console.log('billing-form tests: ok');
