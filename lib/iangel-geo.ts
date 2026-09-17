import { RESTAURANT_INFO } from '@/lib/restaurant';
import { SELF_MAX_M } from '@/lib/iangel-constants';

const EARTH_M = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function metersFromStore(lat: number, lng: number): number {
  return haversineMeters(RESTAURANT_INFO.pickupLat, RESTAURANT_INFO.pickupLng, lat, lng);
}

export function isWithinSelfRadius(meters: number): boolean {
  return meters <= SELF_MAX_M;
}
