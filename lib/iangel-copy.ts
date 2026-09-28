import { SELF_FEE_MXN } from '@/lib/iangel-constants';
import { formatMXN } from '@/lib/pricing';

export const COPY = {
  selfTitle: `Envío IANGEL · ${formatMXN(SELF_FEE_MXN)}`,
  selfBody: 'El rider de la casa lleva tu pedido.',
  waitTitle: `Envío IANGEL · ${formatMXN(SELF_FEE_MXN)}`,
  waitBody:
    'El rider va en otro pedido. El tuyo puede tardar de 35 a 45 min. Conviene pedirlo con anticipación.',
  uberTitle: 'Envío a domicilio',
  uberBody: 'Envío con courier. Se aplica 3% de descuento sobre la cotización.',
  outOfShift: 'Fuera de turno IANGEL (12:00–21:00). El envío se cotiza con courier.',
  inactive: 'IANGEL no está en servicio ahora. Puedes recoger en tienda.',
  tooFar: 'Domicilio hasta 5.5 km. Más lejos no hay envío; puedes recoger en tienda.',
  uberQuoteMissing: 'No se pudo cotizar el envío. Intenta de nuevo o recoger en tienda.',
  eta45:
    'El tiempo estimado para tu pedido es de hasta 45 minutos. Te pedimos realizarlo con anticipación.',
  etaFar:
    'Por la distancia de tu domicilio, el envío se realiza con Uber Direct. El tiempo estimado es de hasta 1 hora y el costo de envío es mayor. Te pedimos realizar tu pedido con anticipación.',
};
