import { OUTER_FEE_MXN } from '@/lib/iangel-constants';
import { formatMXN } from '@/lib/pricing';

export const COPY = {
  selfTitle: 'Envío',
  selfBody: 'El rider de la casa lleva tu pedido.',
  waitTitle: 'Envío',
  waitBody:
    'El rider va en otro pedido. El tuyo puede tardar de 35 a 45 min. Conviene pedirlo con anticipación.',
  managedTitle: 'Envío',
  managedBody: 'Envío a domicilio.',
  uberTitle: 'Envío a domicilio',
  uberBody: 'Envío con courier. Se aplica 3% de descuento sobre la cotización.',
  outOfShift: 'Fuera de horario de domicilio (12:00–21:00). Puedes recoger en tienda.',
  inactive: 'En esta zona el envío no está disponible ahora. Puedes recoger en tienda.',
  tooFar: 'No hay envío a esta distancia. Solo puedes pedir para recoger en tienda.',
  uberQuoteMissing: 'No se pudo cotizar el envío. Intenta de nuevo o recoger en tienda.',
  eta45:
    'El tiempo estimado para tu pedido es de hasta 45 minutos. Te pedimos realizarlo con anticipación.',
  etaFar:
    `Por la distancia, el envío es de ${formatMXN(OUTER_FEE_MXN)} y puede tardar hasta 1 hora. Te pedimos realizar tu pedido con anticipación.`,
};

/** Lo que ve el cliente en rastreo y en el primer correo. El checkout conserva eta45 y etaFar. */
export const DELIVERY_ETA_RANGE = '35-45 min';
export const DELIVERY_ETA_MAIL = 'Tiempo estimado: 35 a 45 minutos.';
export const ENROUTE_ARRIVAL_LINE =
  'Tu pedido va en camino. El repartidor llegará en alrededor de 15 minutos.';
export const IANGEL_EN_ROUTE_DETAIL = 'IANGEL va hacia ti.';

export function formatPickupClock(pickupAt: string) {
  return new Date(pickupAt).toLocaleTimeString('es-MX', {
    timeZone: 'America/Chihuahua',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Domicilio: rango fijo. Recoger: la hora que eligió el cliente. */
export function trackingEtaParts(input: { fulfillment?: string | null; pickupAt?: string | null }) {
  if (input.fulfillment === 'pickup') {
    if (input.pickupAt) {
      return { prefix: 'Hora de recoger:', emphasis: formatPickupClock(input.pickupAt) };
    }
    return { prefix: 'Recoger en tienda', emphasis: '' };
  }
  return { prefix: 'Tiempo estimado:', emphasis: DELIVERY_ETA_RANGE };
}
