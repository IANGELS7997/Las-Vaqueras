import { buildArrivalEmail } from './arrival-email';
import { buildEnrouteEmail } from './enroute-email';
import { buildGiftOrderEmail } from './gift-order-email';
import { loyaltyGuideForOrder, loyaltyGuideFromPaidOrders, loyaltyMailGuide } from './loyalty-mail';
import { buildTicketEmail, purchaseThanksLine } from './ticket-email';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

function beforeButtons(html: string, label: string) {
  const guideAt = html.indexOf('Tu guía de pedidos');
  const buttonsAt = html.indexOf('Ver mi pedido');
  check(guideAt > 0 && buttonsAt > guideAt, `${label}: la guía va antes de los botones`);
}

const third = loyaltyGuideFromPaidOrders({
  orderId: 'c',
  paidOrders: 3,
  firstIds: ['a', 'b', 'c'],
});
check(third.text.includes('Vas en el pedido 3.'), 'el pedido 3 se dice en claro');
check(third.text.includes('Pedidos marcados: 1, 2, 3.'), 'marca solo los pedidos ya hechos');
check(third.text.includes('Este correo es el pedido 3.'), 'marca el pedido de este correo');
check(third.html.includes('border:3px solid #111111;font-weight:700;font-size:13px;text-align:center;">3</div>'), 'el 3 va resaltado');
check(third.html.includes('background:#ea580c;color:#ffffff;border:2px solid transparent;font-weight:700;font-size:16px;text-align:center;">1</div>'), 'el 1 ya hecho se distingue como promo');
check(third.html.includes('background:#fff7ed;color:#ea580c;border:2px solid #ea580c;font-weight:700;font-size:16px;text-align:center;">5</div>'), 'el 5 pendiente se distingue como promo');
check(!third.text.includes('Papas</'), 'la guía no lista platillos');

const guest = loyaltyMailGuide({ paidOrders: 1, currentStep: 1 });
check(guest.text.includes('Vas en el pedido 1.'), 'sin historial este pedido es el 1');

const done = loyaltyGuideFromPaidOrders({
  orderId: 'late',
  paidOrders: 12,
  firstIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
});
check(done.text.includes('Ya usaste las promos del pedido 1, 5 y 10.'), 'después del 10 usa el texto del perfil');
check(done.text.includes('Pedidos marcados: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.'), 'los 10 quedan marcados');
check(!done.text.includes('Vas en el pedido'), 'después del 10 no inventa un número nuevo');
check(!done.html.includes('3px solid #111111'), 'un pedido fuera de la guía no se marca como actual');

const tenth = loyaltyGuideFromPaidOrders({
  orderId: '10',
  paidOrders: 10,
  firstIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
});
check(tenth.text.includes('Ya usaste las promos del pedido 1, 5 y 10.'), 'el pedido 10 cierra la guía');
check(tenth.html.includes('border:3px solid #111111;font-weight:700;font-size:16px;text-align:center;">10</div>'), 'el 10 de este correo queda resaltado');

const unlinked = loyaltyGuideForOrder({
  orderId: 'nuevo',
  hasProfile: true,
  linked: false,
  countsTowardGuide: true,
  paidOrders: 4,
  firstIds: ['a', 'b', 'c', 'd'],
});
check(unlinked.text.includes('Vas en el pedido 5.'), 'un pedido aún no ligado cuenta como el siguiente');

const already = loyaltyGuideForOrder({
  orderId: 'c',
  hasProfile: true,
  linked: true,
  countsTowardGuide: true,
  paidOrders: 3,
  firstIds: ['a', 'b', 'c'],
});
check(already.text.includes('Vas en el pedido 3.'), 'un pedido ya ligado no se cuenta dos veces');

const noProfile = loyaltyGuideForOrder({
  orderId: 'solo',
  hasProfile: false,
  linked: false,
  countsTowardGuide: true,
  paidOrders: 0,
  firstIds: [],
});
check(noProfile.text.includes('Vas en el pedido 1.'), 'sin perfil este pedido es el 1');

check(
  purchaseThanksLine('Ana Lopez') === 'Gracias por tu compra, Ana. En Las Vaqueras preparamos tu pedido con gusto.',
  'el agradecimiento usa el nombre'
);
check(
  purchaseThanksLine('   ') === 'Gracias por tu compra. En Las Vaqueras preparamos tu pedido con gusto.',
  'sin nombre el agradecimiento no deja un hueco'
);

const ticket = buildTicketEmail(
  {
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
  },
  third
);
check(ticket.html.indexOf('Hola Ana') < ticket.html.indexOf('Gracias por tu compra, Ana.'), 'el agradecimiento va después del saludo');
check(ticket.html.indexOf('Total:') < ticket.html.indexOf('Tu guía de pedidos'), 'la guía va debajo de los datos del ticket');
check(ticket.text.includes('Gracias por tu compra, Ana.'), 'el texto del ticket agradece por el nombre');
beforeButtons(ticket.html, 'ticket');

const enroute = buildEnrouteEmail({
  customerName: 'Ana Lopez',
  orderId: 'abc-def',
  guide: third,
});
check(!enroute.html.includes('Gracias por tu compra'), 'en camino no agradece la compra');
check(!enroute.text.includes('Gracias por tu compra'), 'el texto de camino no agradece la compra');
beforeButtons(enroute.html, 'en camino');

const arrival = buildArrivalEmail({
  customerName: 'Ana Lopez',
  orderId: 'abc-def',
  guide: third,
});
check(!arrival.html.includes('Gracias por tu compra'), 'la llegada no agradece la compra');
beforeButtons(arrival.html, 'llegada');

const gift = buildGiftOrderEmail({
  customerName: 'Ana Lopez',
  orderId: 'abc-def-gift',
  fulfillment: 'delivery',
  guide: third,
});
check(!gift.html.includes('Gracias por tu compra'), 'el canje no agradece la compra');
check(gift.html.indexOf('Orden #') < gift.html.indexOf('Tu guía de pedidos'), 'la guía va debajo del canje');
beforeButtons(gift.html, 'canje');

console.log('loyalty-mail tests: ok');
