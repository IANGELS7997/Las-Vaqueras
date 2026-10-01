import {
  FAR_NOTICE_MIN_M,
  OUTER_FEE_MXN,
  SELF_FEE_MXN,
  SELF_MAX_M,
  SERVICE_MAX_M,
  UBER_MIN_M,
  type DeliveryProvider,
} from '@/lib/iangel-constants';
import { COPY } from '@/lib/iangel-copy';
import { isIangelShift } from '@/lib/iangel-shift';

export type RoutingOption = {
  kind: Exclude<DeliveryProvider, 'pickup'>;
  customerFee: number;
  uberFee: number;
  title: string;
  body: string;
};

export type RoutingInput = {
  meters: number;
  now?: Date;
  riderActive: boolean;
  riderBusy: boolean;
  /** Rider deliberately enables Uber Direct for Las Vaqueras checkout. */
  uberDirectEnabled?: boolean;
  priceBaseTotal: number;
  uberQuoteFee?: number | null;
};

export type RoutingResult = {
  meters: number;
  inShift: boolean;
  riderActive: boolean;
  riderBusy: boolean;
  blocked: boolean;
  blockedReason: string | null;
  defaultKind: Exclude<DeliveryProvider, 'pickup'> | null;
  options: RoutingOption[];
  allowSelf: boolean;
  allowUber: boolean;
  allowWait: boolean;
  /** 4501–5500 m con envío disponible. El checkout cambia el aviso de 45 min por el de 1 hora. */
  farZone: boolean;
};

function selfOption(fee = SELF_FEE_MXN): RoutingOption {
  return {
    kind: 'self',
    customerFee: fee,
    uberFee: 0,
    title: fee === SELF_FEE_MXN ? COPY.selfTitle : `Envío IANGEL · $${fee}`,
    body: COPY.selfBody,
  };
}

function waitOption(fee = SELF_FEE_MXN): RoutingOption {
  return {
    kind: 'wait_self',
    customerFee: fee,
    uberFee: 0,
    title: fee === SELF_FEE_MXN ? COPY.waitTitle : `Envío IANGEL · $${fee}`,
    body: COPY.waitBody,
  };
}

/**
 * IANGEL $50 en 0–4000 m y $55 en 4001–6500 m, en turno y con rider activo.
 * Ocupado: el mismo precio, con aviso de espera.
 * Fuera de turno o sin rider: solo recoger en tienda.
 * Más de 6500 m: sin domicilio.
 */
export function resolveDeliveryRouting(input: RoutingInput): RoutingResult {
  const meters = Math.max(0, Math.round(input.meters));
  const inShift = isIangelShift(input.now);
  const covered = meters <= SERVICE_MAX_M;
  const fee = meters <= SELF_MAX_M ? SELF_FEE_MXN : OUTER_FEE_MXN;
  const farZone = meters >= FAR_NOTICE_MIN_M && meters >= UBER_MIN_M;

  const base = {
    meters,
    inShift,
    riderActive: input.riderActive,
    riderBusy: input.riderBusy,
    blocked: false as boolean,
    blockedReason: null as string | null,
    farZone: false,
  };

  const blocked = (reason: string): RoutingResult => ({
    ...base,
    blocked: true,
    blockedReason: reason,
    defaultKind: null,
    options: [],
    allowSelf: false,
    allowUber: false,
    allowWait: false,
  });

  if (!covered) return blocked(COPY.tooFar);
  if (!inShift) return blocked(COPY.outOfShift);
  if (!input.riderActive) return blocked(COPY.inactive);

  if (input.riderBusy) {
    return {
      ...base,
      farZone,
      defaultKind: 'wait_self',
      options: [waitOption(fee)],
      allowSelf: false,
      allowUber: false,
      allowWait: true,
    };
  }

  return {
    ...base,
    farZone,
    defaultKind: 'self',
    options: [selfOption(fee)],
    allowSelf: true,
    allowUber: false,
    allowWait: false,
  };
}

export function needsUberQuote(_input: Omit<RoutingInput, 'uberQuoteFee'>): boolean {
  return false;
}

export function assertProviderAllowed(routing: RoutingResult, kind: DeliveryProvider): boolean {
  if (kind === 'pickup') return true;
  return routing.options.some((option) => option.kind === kind);
}
