/**
 * Organizations API (no se usa en checkout).
 * Consultar: npx tsx scripts/uber-organization.ts
 * Crear sucursal (irreversible por API): UBER_ORG_CONFIRM=1 npx tsx scripts/uber-organization.ts create "Nombre"
 * Invitar: UBER_ORG_CONFIRM=1 npx tsx scripts/uber-organization.ts invite email@... Nombre Apellido ROLE_EMPLOYEE
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createDirectSubOrganization,
  getDirectOrganization,
  inviteDirectOrganizationUser,
} from '@/lib/uber-organizations';

function loadLocalEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadLocalEnv();
  const [, , command = 'get', ...rest] = process.argv;
  if (command === 'get') {
    const org = await getDirectOrganization(rest[0]);
    console.log(JSON.stringify(org, null, 2));
    return;
  }
  if (process.env.UBER_ORG_CONFIRM !== '1') {
    throw new Error('Para create/invite pon UBER_ORG_CONFIRM=1. Uber no borra orgs por API.');
  }
  if (command === 'create') {
    const name = rest[0];
    const email = rest[1] || process.env.UBER_ORG_CONTACT_EMAIL || '';
    if (!name || !email) throw new Error('Uso: create "Nombre sucursal" correo@...');
    const org = await createDirectSubOrganization({ name, contactEmail: email });
    console.log(JSON.stringify(org, null, 2));
    return;
  }
  if (command === 'invite') {
    const [email, firstName, lastName, role] = rest;
    if (!email || !firstName || !lastName) {
      throw new Error('Uso: invite correo@... Nombre Apellido ROLE_EMPLOYEE');
    }
    const invited = await inviteDirectOrganizationUser({
      email,
      firstName,
      lastName,
      role: (role as 'ROLE_ADMIN' | 'ROLE_EMPLOYEE' | 'ROLE_SUPPORT') || 'ROLE_EMPLOYEE',
    });
    console.log(JSON.stringify(invited, null, 2));
    return;
  }
  throw new Error('Comando: get | create | invite');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
