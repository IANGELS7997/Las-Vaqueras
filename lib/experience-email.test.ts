import { EXPERIENCE_WAIT_MS, experienceEmailDue } from './experience-email';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const sent = Date.parse('2026-11-09T18:00:00.000Z');
const ticket = new Date(sent).toISOString();

check(EXPERIENCE_WAIT_MS === 85 * 60 * 1000, 'son 85 minutos');
check(!experienceEmailDue(null, sent + EXPERIENCE_WAIT_MS), 'sin ticket no sale');
check(!experienceEmailDue(ticket, sent + EXPERIENCE_WAIT_MS - 1), 'antes de 85 minutos no sale');
check(experienceEmailDue(ticket, sent + EXPERIENCE_WAIT_MS), 'a los 85 minutos sale');

console.log('experience-email tests: ok');
