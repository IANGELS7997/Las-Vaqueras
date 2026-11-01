import { metersFromBranch } from '@/lib/branches';
import { FAR_NOTICE_MIN_M } from '@/lib/iangel-constants';

export const POSTPONE_CHOICES = [5, 10, 15, 20] as const;
const NORMAL_PROMISE_MINUTES = 45;
const FAR_PROMISE_MINUTES = 60;

export function isPostponeMinutes(value: number): value is (typeof POSTPONE_CHOICES)[number] {
  return POSTPONE_CHOICES.includes(value as (typeof POSTPONE_CHOICES)[number]);
}

export function promiseBaseMinutes(input: {
  fulfillment?: string | null;
  branchId?: unknown;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}) {
  if (input.fulfillment === 'pickup') return 0;
  const lat = Number(input.dropoffLat);
  const lng = Number(input.dropoffLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NORMAL_PROMISE_MINUTES;
  const meters = metersFromBranch(input.branchId, lat, lng);
  return meters >= FAR_NOTICE_MIN_M ? FAR_PROMISE_MINUTES : NORMAL_PROMISE_MINUTES;
}

export function formatChihuahuaClock(date: Date) {
  return date.toLocaleTimeString('es-MX', {
    timeZone: 'America/Chihuahua',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** La última elección sustituye a la anterior. Recoger parte de la hora elegida. Domicilio, del momento del pedido. */
export function postponePromise(input: {
  fulfillment?: string | null;
  createdAt?: string | null;
  pickupAt?: string | null;
  delayMinutes: number;
  branchId?: unknown;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
}) {
  const delay = input.delayMinutes;
  if (input.fulfillment === 'pickup') {
    const chosen = input.pickupAt ? new Date(input.pickupAt) : new Date(input.createdAt || Date.now());
    const at = new Date(chosen.getTime() + delay * 60_000);
    const clock = formatChihuahuaClock(at);
    return {
      totalMinutes: delay,
      at,
      label: `alrededor de las ${clock}`,
      customerSentence: `Cocina necesita un poco más de tiempo para preparar tu pedido. Lo retrasamos ${delay} minutos. Queda aproximadamente a las ${clock}, ${delay} minutos después de la hora que elegiste.`,
    };
  }
  const base = promiseBaseMinutes(input);
  const totalMinutes = base + delay;
  const start = new Date(input.createdAt || Date.now());
  const at = new Date(start.getTime() + totalMinutes * 60_000);
  const clock = formatChihuahuaClock(at);
  return {
    totalMinutes,
    at,
    label: `alrededor de las ${clock} (unos ${totalMinutes} minutos)`,
    customerSentence: `Cocina necesita un poco más de tiempo para preparar tu pedido. Lo retrasamos ${delay} minutos. El tiempo aproximado queda en unos ${totalMinutes} minutos desde que lo pediste, alrededor de las ${clock}.`,
  };
}
