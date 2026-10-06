/** Formulario fijo de facturación. No lleva datos del pedido. */
export const BILLING_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeH2sJ0ISF7dvEY2UJP6r5diyIJZH6eaGc_NTaqfqPORnTmNA/viewform';

/** Pedido ya cobrado. El pago pendiente todavía no tiene factura. */
export function orderCanRequestInvoice(status: string | null | undefined) {
  return status !== 'awaiting_payment';
}

/** Botón aparte de «Ver mi pedido» y «Agregar app al inicio». */
export function billingMailButton() {
  return `<div style="text-align:center;margin:0 0 20px;">
<a href="${BILLING_FORM_URL}" style="display:inline-block;background:#fff;color:#c2410c;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;border:2px solid #ea580c;">Facturación</a>
</div>`;
}

export function billingMailText() {
  return `Facturación: ${BILLING_FORM_URL}`;
}
