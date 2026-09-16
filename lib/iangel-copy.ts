import { COOK_HOLD_MAX_MINUTES, COOK_HOLD_MIN_MINUTES, SELF_FEE_MXN } from '@/lib/iangel-constants';
import { formatMXN } from '@/lib/pricing';

export const COPY = {
  selfTitle: `Envío IANGEL · ${formatMXN(SELF_FEE_MXN)}`,
  selfBody:
    'Repartidor de la casa. Tarifa fija. El restaurante no marca recargo sobre la comida.',
  uberTitle: 'Envío Express',
  uberBody: 'Cotización en vivo. El 3% de la comida se aplica como descuento al envío.',
  waitTitle: `Esperar IANGEL · ${formatMXN(SELF_FEE_MXN)}`,
  waitBody: `El rider va en otro viaje (máximo una bolsa). Tu pedido se prepara cuando libere, en ${COOK_HOLD_MIN_MINUTES}–${COOK_HOLD_MAX_MINUTES} min.`,
  gated:
    'Fraccionamiento cerrado: en horario IANGEL el envío lo cubre el rider de la casa, no Express.',
  outOfRange: 'Esta dirección está fuera de la zona de envío (máximo 5 km). Puedes recoger en tienda.',
  outOfShift: 'Fuera de turno IANGEL (12:00–21:00). No aplica tarifa de $50 ni espera al rider.',
  inactive: 'IANGEL no está en servicio ahora. El envío a domicilio usa cotización Express.',
  quoteTtl: 'La cotización y la asignación caducan en 4 minutos. Al pagar se vuelven a validar.',
  leaveAtDoor: 'Dejar en la puerta. El rider toma foto y marca entregado, sin espera de 10 minutos.',
  holdReady: 'Ya puedes preparar',
  shiftClosedBanner: 'Fuera de turno, $50 cerrado',
  stillActivePush: 'Sigues ACTIVO, abre IANGEL',
  shiftEndPush: 'En 10 minutos cierra la tarifa de $50.',
} as const;
