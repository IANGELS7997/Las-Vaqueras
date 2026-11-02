import { mailButton } from '@/lib/mail-shell';

/** Formulario fijo de facturación. No lleva datos del pedido. */
export const BILLING_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeH2sJ0ISF7dvEY2UJP6r5diyIJZH6eaGc_NTaqfqPORnTmNA/viewform';

/** Pedido ya cobrado. El pago pendiente todavía no tiene factura. */
export function orderCanRequestInvoice(status: string | null | undefined) {
  return status !== 'awaiting_payment';
}

/** Botón aparte de «Ver mi pedido» y «Agregar app al inicio». */
export function billingMailButton() {
  return mailButton(BILLING_FORM_URL, 'Facturación', 'billing');
}

export function billingMailText() {
  return `Facturación: ${BILLING_FORM_URL}`;
}
