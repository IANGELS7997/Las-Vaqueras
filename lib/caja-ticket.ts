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
