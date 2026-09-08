const stripe = $('Normalize Stripe Event').first().json;
const order = $('Get Order By Payment Intent').first().json;
const totalOrders = $input.all().filter(function (item) {
  return item.json && item.json.id && item.json.status !== 'awaiting_payment';
}).length;
const isTenth = false;
const receiptEmail = stripe.receipt_email || order.customer_email || '';

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mxn(value) {
  const amount = Number(value);
  return '$' + (Number.isFinite(amount) ? amount : 0).toFixed(2) + ' MXN';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Chihuahua',
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Chihuahua',
  });
}

function fmtPickup(iso) {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Chihuahua',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const createdAt = order.created_at;
const fulfillment = order.fulfillment_type === 'pickup' ? 'pickup' : 'delivery';
const totalCharged = Number(order.total_charged) || 0;
const serviceFee = Number(order.customer_fee) || 0;
const deliveryFee = Number(order.delivery_fee) || 0;
const subtotal = totalCharged - serviceFee - deliveryFee;
const items = Array.isArray(order.items) ? order.items : [];

let itemsHtml = '';
items.forEach(function (item) {
  itemsHtml += '<p style="margin:0 0 6px;font-weight:700;">' + esc(item.quantity) + 'x ' + esc(item.name) + '</p>';
  (item.selections || []).forEach(function (sel) {
    if (sel.choices && sel.choices.length) {
      itemsHtml +=
        '<p style="margin:0 0 2px 12px;">' +
        esc(sel.optionGroupId_label) +
        ': ' +
        esc(sel.choices.join(', ')) +
        '</p>';
    }
  });
  if (item.comboUpgrade && item.comboUpgrade.name) {
    itemsHtml += '<p style="margin:0 0 2px 12px;">+ ' + esc(item.comboUpgrade.name) + '</p>';
  }
  (item.extras || []).forEach(function (extra) {
    itemsHtml += '<p style="margin:0 0 2px 12px;">+ Extra ' + esc(extra.name) + '</p>';
  });
  if (item.removals && item.removals.length) {
    itemsHtml +=
      '<p style="margin:0 0 2px 12px;">Sin ' + esc(item.removals.join(', ').toLowerCase()) + '</p>';
  }
  if (item.specialInstructions) {
    itemsHtml +=
      '<p style="margin:0 0 2px 12px;font-style:italic;">Nota: ' + esc(item.specialInstructions) + '</p>';
  }
});

const dash = '<div style="border-top:1px dashed #000;margin:8px 0;"></div>';
let fulfillmentHtml = '<p style="margin:0;font-weight:700;">ENTREGA A DOMICILIO</p>';
let customerExtra = '<p style="margin:0;">Dir: ' + esc(order.delivery_address) + '</p>';
if (order.delivery_references) {
  customerExtra += '<p style="margin:0;">Ref: ' + esc(order.delivery_references) + '</p>';
}
if (fulfillment === 'pickup') {
  fulfillmentHtml =
    '<p style="margin:0;font-weight:700;">RECOGER EN TIENDA' +
    (order.pickup_at ? ' · ' + esc(fmtPickup(order.pickup_at)) : '') +
    '</p>';
  customerExtra = '<p style="margin:0;">Recoge en tienda</p>';
}

const envioHtml =
  fulfillment === 'pickup'
    ? ''
    : '<div style="display:flex;justify-content:space-between;"><span>Envio:</span><span>' +
      mxn(deliveryFee) +
      '</span></div>';

const receipt_html =
  '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.35;color:#000;max-width:280px;margin:0 auto;">' +
  '<div style="text-align:center;">' +
  '<p style="margin:0;font-weight:700;">LAS VAQUERAS</p>' +
  '<p style="margin:0;">Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih. Mexico</p>' +
  '<p style="margin:0;">Tel: +52 614 413 6539</p>' +
  '</div>' +
  dash +
  '<p style="margin:0;">Orden: #' +
  esc(String(order.id).slice(0, 8)) +
  '</p>' +
  '<p style="margin:0;">Fecha: ' +
  esc(fmtDate(createdAt)) +
  '</p>' +
  '<p style="margin:0;">Hora: ' +
  esc(fmtTime(createdAt)) +
  '</p>' +
  '<p style="margin:0;font-weight:700;">PAGADO EN LINEA — NO COBRAR</p>' +
  fulfillmentHtml +
  dash +
  '<p style="margin:0;font-weight:700;">Cliente:</p>' +
  '<p style="margin:0;">' +
  esc(order.customer_name) +
  '</p>' +
  '<p style="margin:0;">Tel: ' +
  esc(order.customer_phone) +
  '</p>' +
  customerExtra +
  dash +
  itemsHtml +
  dash +
  '<div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>' +
  mxn(subtotal) +
  '</span></div>' +
  '<div style="display:flex;justify-content:space-between;"><span>Servicio:</span><span>' +
  mxn(serviceFee) +
  '</span></div>' +
  envioHtml +
  '<div style="display:flex;justify-content:space-between;font-weight:700;"><span>TOTAL:</span><span>' +
  mxn(totalCharged) +
  '</span></div>' +
  dash +
  '<div style="text-align:center;">' +
  '<p style="margin:0;">Pago: CARD</p>' +
  '<p style="margin:8px 0 0;">Gracias por tu compra!</p>' +
  '</div></div>';

return [
  {
    json: Object.assign({}, order, {
      payment_intent_id: stripe.payment_intent_id,
      receipt_email: receiptEmail,
      customer_email: order.customer_email || receiptEmail,
      total_orders: totalOrders,
      is_tenth: isTenth,
      loyalty_points: totalOrders,
      receipt_html: receipt_html,
    }),
  },
];
