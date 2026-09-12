import {
  chihuahuaDate,
  getOpenStatus,
  getRestaurantWallClock,
  RESTAURANT_TZ,
} from '@/lib/restaurant';

export const PICKUP_LEAD_MINUTES = 30;
export const PICKUP_SLOT_MINUTES = 15;

export type PickupSlot = {
  iso: string;
  label: string;
};

function addDays(year: number, month: number, dayOfMonth: number, days: number) {
  const utc = new Date(Date.UTC(year, month - 1, dayOfMonth + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    dayOfMonth: utc.getUTCDate(),
  };
}

function nextOpenMoment(from: Date): Date | null {
  const cursor = new Date(from.getTime());
  for (let step = 0; step < 7 * 24 * 4; step += 1) {
    if (getOpenStatus(cursor).isOpen) return cursor;
    cursor.setMinutes(cursor.getMinutes() + 15);
  }
  return null;
}

export function generatePickupSlots(
  from: Date = new Date(),
  options?: { allowWhenClosed?: boolean }
): PickupSlot[] {
  let start = from;
  if (!getOpenStatus(start).isOpen) {
    if (!options?.allowWhenClosed) return [];
    const nextOpen = nextOpenMoment(start);
    if (!nextOpen) return [];
    start = nextOpen;
  }

  const lead = start === from ? PICKUP_LEAD_MINUTES : 0;
  const earliest = new Date(start.getTime() + lead * 60 * 1000);
  const wall = getRestaurantWallClock(earliest);
  const remainder = wall.minute % PICKUP_SLOT_MINUTES;
  let minute = remainder === 0 ? wall.minute : wall.minute + (PICKUP_SLOT_MINUTES - remainder);
  let hour = wall.hour;
  let { year, month, dayOfMonth } = wall;
  if (minute >= 60) {
    minute -= 60;
    hour += 1;
  }
  if (hour >= 24) {
    hour -= 24;
    const next = addDays(year, month, dayOfMonth, 1);
    year = next.year;
    month = next.month;
    dayOfMonth = next.dayOfMonth;
  }

  const slots: PickupSlot[] = [];
  let closedStreak = 0;

  for (let i = 0; i < 96; i += 1) {
    const slotDate = chihuahuaDate(year, month, dayOfMonth, hour, minute);
    if (getOpenStatus(slotDate).isOpen) {
      closedStreak = 0;
      slots.push({
        iso: slotDate.toISOString(),
        label: slotDate.toLocaleTimeString('es-MX', {
          timeZone: RESTAURANT_TZ,
          hour: 'numeric',
          minute: '2-digit',
        }),
      });
    } else if (slots.length > 0) {
      closedStreak += 1;
      if (closedStreak >= 2) break;
    }

    minute += PICKUP_SLOT_MINUTES;
    if (minute >= 60) {
      minute -= 60;
      hour += 1;
    }
    if (hour >= 24) {
      hour -= 24;
      const next = addDays(year, month, dayOfMonth, 1);
      year = next.year;
      month = next.month;
      dayOfMonth = next.dayOfMonth;
    }
  }

  return slots;
}

export function isValidPickupAt(
  iso: string,
  from: Date = new Date(),
  options?: { allowWhenClosed?: boolean }
): boolean {
  return generatePickupSlots(from, options).some((slot) => slot.iso === iso);
}

export function formatPickupAt(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    timeZone: RESTAURANT_TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
