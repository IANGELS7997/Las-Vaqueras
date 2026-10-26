import assert from 'node:assert/strict';
import { getMenuItemById } from '@/lib/mock-data';

const expected: Record<string, string[]> = {
  'hamburguesa-tradicional': ['Queso'],
  'hamburguesa-aguacatosa': ['Queso', 'Aguacate'],
  'hamburguesa-tocino': ['Queso', 'Tocino', 'Aguacate'],
  'hamburguesa-campestre': ['Queso', 'Salchicha para asar', 'Aguacate'],
  'hamburguesa-hawaiana': ['Queso', 'Tocino', 'Piña'],
  'hamburguesa-pollo': ['Jamón', 'Queso', 'Aguacate'],
  'hamburguesa-fajita': ['Queso', 'Aguacate', 'Fajitas de res'],
  'torta-lomo': ['Jamón', 'Queso', 'Aguacate'],
  'torta-vaquera': ['Tocino', 'Carne de hamburguesa', 'Jamón', 'Queso', 'Aguacate'],
  hamburguesita: ['Queso', 'Mayonesa', 'Catsup'],
};

const absent = ['Jitomate', 'Lechuga', 'Cebolla', 'Pepinillos', 'Mostaza'];

for (const [id, names] of Object.entries(expected)) {
  const item = getMenuItemById(id);
  assert.ok(item, id);
  assert.deepEqual(
    (item.removals || []).map((removal) => removal.name),
    names,
    id
  );
  for (const name of absent) {
    assert.equal(
      (item.removals || []).some((removal) => removal.name === name),
      false,
      `${id} no ofrece ${name}`
    );
  }
}

for (const id of ['papas-medianas', 'boneless-chicos', 'combo-pechuguitas', 'refresco-grande']) {
  const item = getMenuItemById(id);
  assert.ok(item, id);
  assert.equal(item.removals, undefined, `${id} no tiene quitar`);
}

const hawaiana = getMenuItemById('hamburguesa-hawaiana');
assert.equal(hawaiana?.extras?.length, 5, 'los extras se quedan');

console.log('menu-removals.test.ts ok');
