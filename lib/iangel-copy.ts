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
  tooFar: 'Domicilio hasta 4.5 km. Más de 4500 m no hay envío; recoger en tienda.',
};
