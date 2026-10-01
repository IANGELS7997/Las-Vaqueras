import { haversineMeters } from '@/lib/iangel-geo';
import { getRestaurantWallClock, type RestaurantWallClock } from '@/lib/restaurant';

export const BRANCH_IDS = ['centro', 'norte', 'sur'] as const;
export type BranchId = (typeof BRANCH_IDS)[number];

export type Branch = {
  id: BranchId;
  username: 'CENTRO' | 'NORTE' | 'SUR';
  /** Centro sigue en la estación que ya existe. */
  stationId: 'main' | 'norte' | 'sur';
  passwordEnv: 'KITCHEN_PASSWORD_CENTRO' | 'KITCHEN_PASSWORD_NORTE' | 'KITCHEN_PASSWORD_SUR';
  name: string;
  shortName: string;
  address: string;
  street: string;
  zipCode: string;
  phone: string;
  lat: number;
  lng: number;
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  hoursLabel: string;
  /** Norte y Sur entregan mientras la sucursal está abierta. Centro usa el turno IANGEL. */
  deliveryFollowsStoreHours: boolean;
};

export const BRANCHES: Branch[] = [
  {
    id: 'centro',
    username: 'CENTRO',
    stationId: 'main',
    passwordEnv: 'KITCHEN_PASSWORD_CENTRO',
    name: 'Las Vaqueras Sucursal Centro',
    shortName: 'Sucursal Centro',
    address: 'Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih.',
    street: 'Rio de Janeiro 903, Panamericana',
    zipCode: '31210',
    phone: '+52 614 413 6539',
    lat: 28.657575,
    lng: -106.108617,
    openHour: 12,
    openMinute: 15,
    closeHour: 21,
    closeMinute: 15,
    hoursLabel: '12:15pm - 9:15pm',
    deliveryFollowsStoreHours: false,
  },
  {
    id: 'norte',
    username: 'NORTE',
    stationId: 'norte',
    passwordEnv: 'KITCHEN_PASSWORD_NORTE',
    name: 'Las Vaqueras Sucursal Norte',
    shortName: 'Sucursal Norte',
    address: 'C. Rey Hugo Capeto 17900, Villas del Rey, 31180, Chihuahua, Chih.',
    street: 'C. Rey Hugo Capeto 17900, Villas del Rey',
    zipCode: '31180',
    phone: '+52 614 483 7154',
    lat: 28.746748,
    lng: -106.129587,
    openHour: 13,
    openMinute: 0,
    closeHour: 21,
    closeMinute: 30,
    hoursLabel: '1:00pm - 9:30pm',
    deliveryFollowsStoreHours: true,
  },
  {
    id: 'sur',
    username: 'SUR',
    stationId: 'sur',
    passwordEnv: 'KITCHEN_PASSWORD_SUR',
    name: 'Las Vaqueras Sucursal Sur',
    shortName: 'Sucursal Sur',
    address: 'José Velázquez 2408, Villa Juárez, 31064, Chihuahua, Chih.',
    street: 'José Velázquez 2408, Villa Juárez',
    zipCode: '31064',
    phone: '+52 614 610 4702',
    lat: 28.619227,
    lng: -106.023901,
    openHour: 13,
    openMinute: 0,
    closeHour: 21,
    closeMinute: 15,
    hoursLabel: '1:00pm - 9:15pm',
    deliveryFollowsStoreHours: true,
  },
];

const BY_ID = new Map(BRANCHES.map((branch) => [branch.id, branch]));

export function isBranchId(value: unknown): value is BranchId {
  return value === 'centro' || value === 'norte' || value === 'sur';
}

export function branchById(value: unknown): Branch {
  if (isBranchId(value)) return BY_ID.get(value) || BRANCHES[0];
  return BRANCHES[0];
}

export function branchByUsername(value: unknown): Branch | null {
  const username = String(value || '').trim().toUpperCase();
  return BRANCHES.find((branch) => branch.username === username) || null;
}

export function orderBranchId(value: unknown): BranchId {
  return isBranchId(value) ? value : 'centro';
}

export function metersFromBranch(branchId: unknown, lat: number, lng: number): number {
  const branch = branchById(branchId);
  return haversineMeters(branch.lat, branch.lng, lat, lng);
}

export function nearestBranch(lat: number, lng: number): Branch {
  return BRANCHES.slice().sort(
    (left, right) =>
      haversineMeters(left.lat, left.lng, lat, lng) - haversineMeters(right.lat, right.lng, lat, lng)
  )[0];
}

function openOnClock(branch: Branch, wall: RestaurantWallClock): boolean {
  const current = wall.hour * 60 + wall.minute;
  const open = branch.openHour * 60 + branch.openMinute;
  const close = branch.closeHour * 60 + branch.closeMinute;
  return current >= open && current <= close;
}

export function isBranchOpen(branchId: unknown, date: Date = new Date()): boolean {
  return openOnClock(branchById(branchId), getRestaurantWallClock(date));
}

export function branchTodayHours(branchId: unknown, date: Date = new Date()): string {
  const branch = branchById(branchId);
  const wall = getRestaurantWallClock(date);
  const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${names[wall.day]}: ${branch.hoursLabel}`;
}

export function branchNextOpenLabel(branchId: unknown, date: Date = new Date()): string {
  if (isBranchOpen(branchId, date)) return branchTodayHours(branchId, date);
  const cursor = new Date(date.getTime());
  for (let step = 0; step < 7 * 24 * 4; step += 1) {
    cursor.setMinutes(cursor.getMinutes() + 15);
    if (isBranchOpen(branchId, cursor)) return branchTodayHours(branchId, cursor);
  }
  return branchTodayHours(branchId, date);
}

export function branchMailLine(branchId: unknown): string {
  const branch = branchById(branchId);
  return `${branch.name}<br/>${branch.street}, Chihuahua`;
}
