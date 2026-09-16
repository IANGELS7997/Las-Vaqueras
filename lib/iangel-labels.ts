import type { DeliveryProvider } from '@/lib/iangel-constants';

export type KitchenTicketLabel = 'CASA' | 'ESPERA' | 'UBER' | 'RECOGER';

export function kitchenTicketLabel(input: {
  fulfillment: 'pickup' | 'delivery';
  provider?: DeliveryProvider | string | null;
  cookHold?: boolean;
}): KitchenTicketLabel {
  if (input.fulfillment === 'pickup' || input.provider === 'pickup') return 'RECOGER';
  if (input.cookHold || input.provider === 'wait_self') return 'ESPERA';
  if (input.provider === 'self') return 'CASA';
  return 'UBER';
}

export function kitchenTicketLabelCopy(label: KitchenTicketLabel): string {
  switch (label) {
    case 'CASA':
      return 'CASA · IANGEL';
    case 'ESPERA':
      return 'ESPERA · no preparar hasta aviso';
    case 'UBER':
      return 'UBER';
    case 'RECOGER':
      return 'RECOGER EN TIENDA';
  }
}

export function orderShortCodeFromId(id: string): string {
  const compact = id.replace(/-/g, '').slice(-4).toUpperCase();
  return compact || '0000';
}
