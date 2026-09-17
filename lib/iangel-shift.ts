import { RESTAURANT_TZ } from '@/lib/restaurant';
import { SHIFT_END_SEC, SHIFT_START_SEC, SHIFT_WARN_HOUR, SHIFT_WARN_MINUTE } from '@/lib/iangel-constants';

export type ChihuahuaClock = {
  hour: number;
  minute: number;
  second: number;
  secondsFromMidnight: number;
};

export function getChihuahuaClock(date: Date = new Date()): ChihuahuaClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
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
