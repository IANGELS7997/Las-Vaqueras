import type { BranchId } from '@/lib/branches';
import type { FulfillmentMode } from '@/types';

/** Línea superior del ticket de caja. Centro y recoger no la llevan. */
export function cajaTicketBanner(input: {
  branchId?: BranchId | null;
  fulfillment?: FulfillmentMode | null;
}): string | null {
  if (input.fulfillment !== 'delivery') return null;
  if (input.branchId !== 'norte' && input.branchId !== 'sur') return null;
  return 'GESTIONAR PEDIDO';
}

export type CajaPayBanner = {
  title: string;
  lines: string[];
};

/** Método de pago del ticket. El título va en grande; el resto aclara si se cobra o no. */
export function cajaPayBanner(input: {
  payMethod?: string | null;
  cardFunding?: string | null;
}): CajaPayBanner {
  if (input.payMethod === 'cash') {
    return { title: 'EFECTIVO', lines: ['COBRAR EN CAJA'] };
  }
  const kind =
    input.cardFunding === 'debit'
      ? 'DEBITO'
      : input.cardFunding === 'credit'
        ? 'CREDITO'
        : input.cardFunding === 'prepaid'
          ? 'PREPAGO'
          : null;
  return {
    title: kind ? `TARJETA ${kind}` : 'TARJETA',
    lines: ['PAGADO EN LINEA — NO COBRAR', 'EN POS: YA PAGADA'],
  };
}
