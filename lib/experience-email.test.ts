import { EXPERIENCE_SUBJECT, EXPERIENCE_WAIT_MS, buildExperienceEmail, experienceEmailDue } from './experience-email';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const sent = Date.parse('2026-11-09T18:00:00.000Z');
const ticket = new Date(sent).toISOString();

check(EXPERIENCE_WAIT_MS === 85 * 60 * 1000, 'son 85 minutos');
check(!experienceEmailDue(null, sent + EXPERIENCE_WAIT_MS), 'sin ticket no sale');
check(!experienceEmailDue(ticket, sent + EXPERIENCE_WAIT_MS - 1), 'antes de 85 minutos no sale');
check(experienceEmailDue(ticket, sent + EXPERIENCE_WAIT_MS), 'a los 85 minutos sale');

const message = buildExperienceEmail({
  customerName: 'Ana López',
  orderId: 'pedido-prueba',
  branchId: 'centro',
});
check(EXPERIENCE_SUBJECT === 'Califica tu experiencia · Las Vaqueras', 'el asunto pide calificar la experiencia');
check(message.subject === EXPERIENCE_SUBJECT, 'el correo usa ese asunto');
check(message.html.includes('Califica tu experiencia'), 'el título está en el correo');
check(!message.html.includes('Tu opinión'), 'el correo ya no lleva la ceja');
check(message.text.includes('Califica tu experiencia.'), 'el texto plano usa la misma frase');
check(!message.text.includes('¿Cómo estuvo tu pedido?'), 'el texto plano ya no hace la pregunta vieja');

console.log('experience-email tests: ok');
