import { SELF_FEE_MXN, SELF_MAX_M, UBER_MAX_M, UBER_MIN_M, type DeliveryProvider } from '@/lib/iangel-constants';
import { COPY } from '@/lib/iangel-copy';
import { calcCustomerDeliveryFee } from '@/lib/delivery-tarifa';
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
};

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function uberOption(uberQuoteFee: number | null | undefined): RoutingOption | null {
  if (uberQuoteFee == null || !Number.isFinite(uberQuoteFee)) return null;
  const { deliveryFee } = calcCustomerDeliveryFee({ uberFee: uberQuoteFee });
  return {
    kind: 'uber',
    customerFee: deliveryFee,
    uberFee: money(uberQuoteFee),
    title: COPY.uberTitle,
    body: COPY.uberBody,
  };
}

function selfOption(): RoutingOption {
  return {
    kind: 'self',
    customerFee: SELF_FEE_MXN,
    uberFee: 0,
    title: COPY.selfTitle,
    body: COPY.selfBody,
  };
}

function waitOption(): RoutingOption {
  return {
    kind: 'wait_self',
    customerFee: SELF_FEE_MXN,
    uberFee: 0,
    title: COPY.waitTitle,
    body: COPY.waitBody,
  };
}

/**
 * IANGEL $50: 0–3000 m, turno 12:00–21:00, rider activo.
 * Ocupado en ese radio: $50 + aviso, sin Uber.
 * Uber (quote × 0.97): 3001–4000 m siempre; y 0–3000 m desde las 21:00 (fuera de turno).
 * Más de 4000 m: sin domicilio.
 */
export function resolveDeliveryRouting(input: RoutingInput): RoutingResult {
  const meters = Math.max(0, Math.round(input.meters));
  const inShift = isIangelShift(input.now);
  const uber = uberOption(input.uberQuoteFee);
  const inIangelBand = meters <= SELF_MAX_M;
  const inUberBand = meters >= UBER_MIN_M && meters <= UBER_MAX_M;
  const selfEligible = inShift && input.riderActive && inIangelBand;
  const waitEligible = selfEligible && input.riderBusy;
  const selfFree = selfEligible && !input.riderBusy;

  const base = {
    meters,
    inShift,
    riderActive: input.riderActive,
    riderBusy: input.riderBusy,
    blocked: false as boolean,
    blockedReason: null as string | null,
  };

  if (meters > UBER_MAX_M) {
    return {
      ...base,
      blocked: true,
      blockedReason: COPY.tooFar,
      defaultKind: null,
      options: [],
      allowSelf: false,
      allowUber: false,
      allowWait: false,
    };
  }

  if (inUberBand) {
    if (uber) {
      return {
        ...base,
        defaultKind: 'uber',
        options: [uber],
        allowSelf: false,
        allowUber: true,
        allowWait: false,
      };
    }
    return {
      ...base,
      blocked: true,
      blockedReason: COPY.inactive,
      defaultKind: null,
      options: [],
      allowSelf: false,
      allowUber: false,
      allowWait: false,
    };
  }

  if (selfFree) {
    return {
      ...base,
      defaultKind: 'self',
      options: [selfOption()],
      allowSelf: true,
      allowUber: false,
      allowWait: false,
    };
  }

  if (waitEligible) {
    return {
      ...base,
      defaultKind: 'wait_self',
      options: [waitOption()],
      allowSelf: false,
      allowUber: false,
      allowWait: true,
    };
  }

  if (!inShift && uber) {
    return {
      ...base,
      defaultKind: 'uber',
      options: [uber],
      allowSelf: false,
      allowUber: true,
      allowWait: false,
    };
  }

  return {
    ...base,
    blocked: true,
    blockedReason: !inShift ? COPY.outOfShift : COPY.inactive,
    defaultKind: null,
    options: [],
    allowSelf: false,
    allowUber: false,
    allowWait: false,
  };
}

export function needsUberQuote(input: Omit<RoutingInput, 'uberQuoteFee'>): boolean {
  const meters = Math.max(0, Math.round(input.meters));
  if (meters > UBER_MAX_M) return false;
  if (meters >= UBER_MIN_M) return true;
  return !isIangelShift(input.now);
}

export function assertProviderAllowed(routing: RoutingResult, kind: DeliveryProvider): boolean {
  if (kind === 'pickup') return true;
  return routing.options.some((option) => option.kind === kind);
}
