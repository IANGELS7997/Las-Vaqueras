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
  tooFar: 'Domicilio hasta 6.5 km. Más lejos no hay envío; puedes recoger en tienda.',
  uberQuoteMissing: 'No se pudo cotizar el envío. Intenta de nuevo o recoger en tienda.',
  eta45:
    'El tiempo estimado para tu pedido es de hasta 45 minutos. Te pedimos realizarlo con anticipación.',
  etaFar:
    `Por la distancia, el envío es de ${formatMXN(OUTER_FEE_MXN)} y puede tardar hasta 1 hora. Te pedimos realizar tu pedido con anticipación.`,
};
