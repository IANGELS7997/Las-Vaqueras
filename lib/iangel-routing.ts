import { branchById, isBranchOpen, type BranchId } from '@/lib/branches';
import {
  FAR_NOTICE_MIN_M,
  OUTER_FEE_MXN,
  SELF_FEE_MXN,
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
  branchId?: BranchId;
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

function managedOption(customerFee = OUTER_FEE_MXN): RoutingOption {
  return {
    kind: 'managed',
    customerFee,
    uberFee: 0,
    title: COPY.managedTitle,
    body: COPY.managedBody,
  };
}

function centroNearManaged(base: Omit<RoutingResult, 'defaultKind' | 'options' | 'allowSelf' | 'allowUber' | 'allowWait' | 'blocked' | 'blockedReason'>): RoutingResult {
  return {
    ...base,
    blocked: false,
    blockedReason: null,
    farZone: false,
    defaultKind: 'managed',
    options: [managedOption(SELF_FEE_MXN)],
    allowSelf: false,
    allowUber: false,
    allowWait: false,
  };
}

/**
 * Centro, 0–4000 m con rider activo: IANGEL $50 hasta las 21:00.
 * Centro, 0–4000 m sin rider, tienda abierta: «Gestionar pedido» $50, solo tarjeta, hasta el cierre (21:15).
 * Centro, 4001–6500 m: «Gestionar pedido» $55. No depende del rider y termina con el turno (21:00).
 * Norte y Sur: «Gestionar pedido» mientras la sucursal está abierta.
 * Más de 6500 m: sin domicilio.
 */
export function resolveDeliveryRouting(input: RoutingInput): RoutingResult {
  const meters = Math.max(0, Math.round(input.meters));
  const branch = branchById(input.branchId);
  const inShift = branch.deliveryFollowsStoreHours
    ? isBranchOpen(branch.id, input.now)
    : isIangelShift(input.now);
  const covered = meters <= SERVICE_MAX_M;
  const outer = meters >= UBER_MIN_M && meters <= SERVICE_MAX_M;
  const farZone = meters >= FAR_NOTICE_MIN_M && covered;

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

  if (branch.deliveryFollowsStoreHours) {
    if (!inShift) {
      return blocked(
        `Fuera de horario de ${branch.shortName} (${branch.hoursLabel}). Puedes recoger en tienda.`
      );
    }
    return {
      ...base,
      farZone: meters >= FAR_NOTICE_MIN_M,
      defaultKind: 'managed',
      options: [managedOption(outer ? OUTER_FEE_MXN : SELF_FEE_MXN)],
      allowSelf: false,
      allowUber: false,
      allowWait: false,
    };
  }

  const storeOpen = isBranchOpen(branch.id, input.now);
  const near = meters < UBER_MIN_M;
  if (!inShift) {
    if (near && storeOpen) return centroNearManaged(base);
    return blocked(COPY.outOfShift);
  }

  if (outer) {
    return {
      ...base,
      farZone,
      defaultKind: 'managed',
      options: [managedOption()],
      allowSelf: false,
      allowUber: false,
      allowWait: false,
    };
  }

  if (!input.riderActive) {
    if (storeOpen) return centroNearManaged(base);
    return blocked(COPY.inactive);
  }

  if (input.riderBusy) {
    return {
      ...base,
      farZone: false,
      defaultKind: 'wait_self',
      options: [waitOption()],
      allowSelf: false,
      allowUber: false,
      allowWait: true,
    };
  }

  return {
    ...base,
    farZone: false,
    defaultKind: 'self',
    options: [selfOption()],
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
