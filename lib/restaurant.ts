export const RESTAURANT_INFO = {
  name: 'Las Vaqueras',
  address: 'Rio de Janeiro 903, Panamericana, 31210, Chihuahua, Chih. Mexico',
  phone: '+52 614 413 6539',
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

export function getOpenStatus(date: Date = new Date()): { isOpen: boolean; label: string } {
  const day = date.getDay();
  const schedule = SCHEDULE[day];
  if (!schedule) return { isOpen: false, label: 'Cerrado' };

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
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

export function getTodayHours(date: Date = new Date()): string {
  const day = date.getDay();
  const names = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const schedule = SCHEDULE[day];
  if (!schedule) return 'Cerrado';

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${m.toString().padStart(2, '0')}${period}`;
  };

  const open = formatTime(schedule.openHour, schedule.openMinute);
  const close = formatTime(schedule.closeHour, schedule.closeMinute);
  return `${names[day]}: ${open} - ${close}`;
}
