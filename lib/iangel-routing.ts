import { branchById, isBranchOpen, type BranchId } from '@/lib/branches';
import {
  FAR_NOTICE_MIN_M,
  OUTER_FEE_MXN,
  SELF_FEE_MXN,
  SELF_MAX_M,
  SERVICE_MAX_M,
  managedCircleFee,
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
  /** Desde 4501 m y hasta 5000 m. El checkout cambia el aviso de 45 min por el de 1 hora. */
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

function managedResult(
  base: Omit<RoutingResult, 'defaultKind' | 'options' | 'allowSelf' | 'allowUber' | 'allowWait' | 'blocked' | 'blockedReason' | 'farZone'>,
  meters: number,
  customerFee: number
): RoutingResult {
  return {
    ...base,
    blocked: false,
    blockedReason: null,
    farZone: meters >= FAR_NOTICE_MIN_M,
    defaultKind: 'managed',
    options: [managedOption(customerFee)],
    allowSelf: false,
    allowUber: false,
    allowWait: false,
  };
}

/**
 * Círculo en línea recta desde la sucursal elegida. El metro no se redondea.
 * 0–2900 m: $39. 2900.1–4000 m: $49. 4000.1–5000 m: $55. Más de 5000 m: sin envío.
 * Centro, rider en servicio y turno 12:00–21:00: 0–4000 m sigue en iAngel a $50.
 * Centro sin rider, o después de las 21:00 con la tienda abierta: la escala de la sucursal.
 * Norte y Sur: esa escala mientras la sucursal está abierta.
 */
export function resolveDeliveryRouting(input: RoutingInput): RoutingResult {
  const meters = Math.max(0, input.meters);
  const branch = branchById(input.branchId);
  const inShift = branch.deliveryFollowsStoreHours
    ? isBranchOpen(branch.id, input.now)
    : isIangelShift(input.now);
  const covered = meters <= SERVICE_MAX_M;
  const iangelZone = meters <= SELF_MAX_M;
  const bandFee = managedCircleFee(meters);

  const base = {
    meters,
    inShift,
    riderActive: input.riderActive,
    riderBusy: input.riderBusy,
    blocked: false as boolean,
    blockedReason: null as string | null,
  };

  const blocked = (reason: string): RoutingResult => ({
    ...base,
    blocked: true,
    blockedReason: reason,
    farZone: false,
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
    return managedResult(base, meters, bandFee);
  }

  const storeOpen = isBranchOpen(branch.id, input.now);
  if (!iangelZone) {
    if (!inShift && !storeOpen) return blocked(COPY.outOfShift);
    return managedResult(base, meters, bandFee);
  }

  if (!inShift) {
    if (storeOpen) return managedResult(base, meters, bandFee);
    return blocked(COPY.outOfShift);
  }

  if (!input.riderActive) {
    if (storeOpen) return managedResult(base, meters, bandFee);
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
