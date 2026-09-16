import {
  MAX_DELIVERY_M,
  SELF_FEE_MXN,
  SELF_MAX_M,
  type DeliveryProvider,
} from '@/lib/iangel-constants';
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
  gatedCommunity?: boolean;
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

function uberOption(priceBaseTotal: number, uberQuoteFee: number | null | undefined): RoutingOption | null {
  if (uberQuoteFee == null || !Number.isFinite(uberQuoteFee)) return null;
  const { deliveryFee } = calcCustomerDeliveryFee({
    uberFee: uberQuoteFee,
    priceBaseTotal,
  });
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
 * Radio + turno + activo/ocupado.
 * $50 only: IANGEL shift AND rider active AND <= 4 km.
 * From 21:00:00 no $50 and no wait. 20:59:59 still eligible.
 */
export function resolveDeliveryRouting(input: RoutingInput): RoutingResult {
  const meters = Math.max(0, input.meters);
  const inShift = isIangelShift(input.now);
  const gated = Boolean(input.gatedCommunity);
  const uber = uberOption(input.priceBaseTotal, input.uberQuoteFee);

  if (meters > MAX_DELIVERY_M) {
    return {
      meters,
      inShift,
      riderActive: input.riderActive,
      riderBusy: input.riderBusy,
      blocked: true,
      blockedReason: COPY.outOfRange,
      defaultKind: null,
      options: [],
      allowSelf: false,
      allowUber: false,
      allowWait: false,
    };
  }

  const inSelfRing = meters <= SELF_MAX_M;
  const selfEligible = inShift && input.riderActive && inSelfRing;
  const waitEligible = selfEligible && input.riderBusy;
  const selfFree = selfEligible && !input.riderBusy;

  const options: RoutingOption[] = [];

  if (gated && inShift && inSelfRing) {
    if (!input.riderActive) {
      return {
        meters,
        inShift,
        riderActive: input.riderActive,
        riderBusy: input.riderBusy,
        blocked: true,
        blockedReason: `${COPY.gated} ${COPY.inactive} Puedes recoger en tienda.`,
        defaultKind: null,
        options: [],
        allowSelf: false,
        allowUber: false,
        allowWait: false,
      };
    }
    if (waitEligible) {
      options.push(waitOption());
      return {
        meters,
        inShift,
        riderActive: input.riderActive,
        riderBusy: input.riderBusy,
        blocked: false,
        blockedReason: null,
        defaultKind: 'wait_self',
        options,
        allowSelf: false,
        allowUber: false,
        allowWait: true,
      };
    }
    options.push(selfOption());
    return {
      meters,
      inShift,
      riderActive: input.riderActive,
      riderBusy: input.riderBusy,
      blocked: false,
      blockedReason: null,
      defaultKind: 'self',
      options,
      allowSelf: true,
      allowUber: false,
      allowWait: false,
    };
  }

  if (selfFree) {
    options.push(selfOption());
    if (uber) options.push(uber);
    return {
      meters,
      inShift,
      riderActive: input.riderActive,
      riderBusy: input.riderBusy,
      blocked: false,
      blockedReason: null,
      defaultKind: 'self',
      options,
      allowSelf: true,
      allowUber: Boolean(uber),
      allowWait: false,
    };
  }

  if (waitEligible) {
    options.push(waitOption());
    if (uber) options.push(uber);
    return {
      meters,
      inShift,
      riderActive: input.riderActive,
      riderBusy: input.riderBusy,
      blocked: false,
      blockedReason: null,
      defaultKind: 'wait_self',
      options,
      allowSelf: false,
      allowUber: Boolean(uber),
      allowWait: true,
    };
  }

  if (uber) {
    options.push(uber);
    return {
      meters,
      inShift,
      riderActive: input.riderActive,
      riderBusy: input.riderBusy,
      blocked: false,
      blockedReason: null,
      defaultKind: 'uber',
      options,
      allowSelf: false,
      allowUber: true,
      allowWait: false,
    };
  }

  return {
    meters,
    inShift,
    riderActive: input.riderActive,
    riderBusy: input.riderBusy,
    blocked: true,
    blockedReason: !inShift ? COPY.outOfShift : COPY.inactive,
    defaultKind: null,
    options: [],
    allowSelf: false,
    allowUber: false,
    allowWait: false,
  };
}

export function assertProviderAllowed(
  routing: RoutingResult,
  kind: DeliveryProvider
): boolean {
  if (kind === 'pickup') return true;
  return routing.options.some((option) => option.kind === kind);
}
