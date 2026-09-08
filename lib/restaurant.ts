export const RESTAURANT_TZ = 'America/Chihuahua';
/** Chihuahua remains UTC-6 year-round. */
export const RESTAURANT_UTC_OFFSET = '-06:00';

export const RESTAURANT_INFO = {
  name: 'Las Vaqueras',
  address: 'Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih. Mexico',
  phone: '+52 614 413 6539',
  pickupLat: 28.6918,
  pickupLng: -106.1306,
  city: 'Chihuahua',
  state: 'CHH',
  zipCode: '31210',
  country: 'MX',
  hours: [
    { day: 'Lunes', hours: '12:15pm - 9:15pm' },
    { day: 'Martes', hours: '12:15pm - 9:15pm' },
    { day: 'Miércoles', hours: '12:05pm - 12:30am' },
    { day: 'Jueves', hours: '9:30am - 1:00am' },
    { day: 'Viernes', hours: '12:15pm - 9:15pm' },
    { day: 'Sábado', hours: '12:15pm - 9:15pm' },
    { day: 'Domingo', hours: '12:15pm - 9:15pm' },
  ],
};

interface DaySchedule {
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  crossesMidnight: boolean;
}

const SCHEDULE: Record<number, DaySchedule> = {
  1: { openHour: 12, openMinute: 15, closeHour: 21, closeMinute: 15, crossesMidnight: false },
  2: { openHour: 12, openMinute: 15, closeHour: 21, closeMinute: 15, crossesMidnight: false },
  3: { openHour: 12, openMinute: 5, closeHour: 0, closeMinute: 30, crossesMidnight: true },
  4: { openHour: 9, openMinute: 30, closeHour: 1, closeMinute: 0, crossesMidnight: true },
  5: { openHour: 12, openMinute: 15, closeHour: 21, closeMinute: 15, crossesMidnight: false },
  6: { openHour: 12, openMinute: 15, closeHour: 21, closeMinute: 15, crossesMidnight: false },
  0: { openHour: 12, openMinute: 15, closeHour: 21, closeMinute: 15, crossesMidnight: false },
};

export type RestaurantWallClock = {
  day: number;
  hour: number;
  minute: number;
  year: number;
  month: number;
  dayOfMonth: number;
};

export function getRestaurantWallClock(date: Date = new Date()): RestaurantWallClock {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESTAURANT_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const weekday = get('weekday');
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayMap[weekday] ?? date.getDay(),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    year: Number(get('year')),
    month: Number(get('month')),
    dayOfMonth: Number(get('day')),
  };
}

export function chihuahuaDate(
  year: number,
  month: number,
  dayOfMonth: number,
  hour: number,
  minute: number
): Date {
  const pad = (value: number) => String(value).padStart(2, '0');
  return new Date(
    `${year}-${pad(month)}-${pad(dayOfMonth)}T${pad(hour)}:${pad(minute)}:00${RESTAURANT_UTC_OFFSET}`
  );
}

export function getOpenStatus(date: Date = new Date()): { isOpen: boolean; label: string } {
  const wall = getRestaurantWallClock(date);
  const schedule = SCHEDULE[wall.day];
  if (!schedule) return { isOpen: false, label: 'Cerrado' };

  const currentMinutes = wall.hour * 60 + wall.minute;
  const openMinutes = schedule.openHour * 60 + schedule.openMinute;
  const closeMinutes = schedule.closeHour * 60 + schedule.closeMinute;

  let isOpen: boolean;
  if (schedule.crossesMidnight) {
    isOpen = currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    isOpen = currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }

  return { isOpen, label: isOpen ? 'Abierto' : 'Cerrado' };
}

export function getNextOpenLabel(date: Date = new Date()): string {
  if (getOpenStatus(date).isOpen) return getTodayHours(date);

  const cursor = new Date(date.getTime());
  for (let step = 0; step < 7 * 24 * 4; step += 1) {
    cursor.setMinutes(cursor.getMinutes() + 15);
    if (getOpenStatus(cursor).isOpen) {
      return getTodayHours(cursor);
    }
  }
  return getTodayHours(date);
}

export function getTodayHours(date: Date = new Date()): string {
  const wall = getRestaurantWallClock(date);
  const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const schedule = SCHEDULE[wall.day];
  if (!schedule) return 'Cerrado';

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
  };

  const open = formatTime(schedule.openHour, schedule.openMinute);
  const close = formatTime(schedule.closeHour, schedule.closeMinute);
  return `${names[wall.day]}: ${open} - ${close}`;
}
