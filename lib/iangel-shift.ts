import { chihuahuaWallInstant } from '@/lib/restaurant';
import { SHIFT_END_SEC, SHIFT_START_SEC, SHIFT_WARN_HOUR, SHIFT_WARN_MINUTE } from '@/lib/iangel-constants';

export type ChihuahuaClock = {
  hour: number;
  minute: number;
  second: number;
  secondsFromMidnight: number;
};

export function getChihuahuaClock(date: Date = new Date()): ChihuahuaClock {
  const wall = chihuahuaWallInstant(date);
  const hour = wall.getUTCHours();
  const minute = wall.getUTCMinutes();
  const second = wall.getUTCSeconds();
  return {
    hour,
    minute,
    second,
    secondsFromMidnight: hour * 3600 + minute * 60 + second,
  };
}

/** 12:00:00 inclusive → 21:00:00 exclusive, America/Chihuahua. */
export function isIangelShift(date: Date = new Date()): boolean {
  const { secondsFromMidnight } = getChihuahuaClock(date);
  return secondsFromMidnight >= SHIFT_START_SEC && secondsFromMidnight < SHIFT_END_SEC;
}

export function isIangelShiftEndWarning(date: Date = new Date()): boolean {
  if (!isIangelShift(date)) return false;
  const { hour, minute } = getChihuahuaClock(date);
  return hour === SHIFT_WARN_HOUR && minute >= SHIFT_WARN_MINUTE;
}
