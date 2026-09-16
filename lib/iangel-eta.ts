import { haversineMeters } from '@/lib/iangel-geo';

/** Minutes: km × 2.5 + 3. Recalc on each GPS ping. */
export function etaMinutesFromKm(km: number): number {
  const safe = Math.max(0, km);
  return Math.max(1, Math.round(safe * 2.5 + 3));
}

export function etaMinutesBetween(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const km = haversineMeters(fromLat, fromLng, toLat, toLng) / 1000;
  return etaMinutesFromKm(km);
}

export function etaCopy(minutes: number): string {
  return `Llego en ~${minutes} min`;
}
