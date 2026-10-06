import assert from 'node:assert/strict';
import { blockedIds, cartStockError, isStockItemId, stockRows } from './branch-stock';

const sauces = stockRows().filter((row) => row.kind === 'sauce').map((row) => row.name);
assert.deepEqual(sauces, [
  'Búfalo Chiltepín',
  'Mango Habanero',
  'Búfalo',
  'Fresa Spicy',
  'Zarzamora Spicy',
  'Chipotle',
  'Lemon Pepper',
  'BBQ',
]);
assert.equal(sauces.includes('Tamarindo'), false);
assert.equal(isStockItemId('agua-de-limon'), true);
assert.equal(isStockItemId('agua-de-horchata'), true);
assert.equal(isStockItemId('agua-fresca-500'), false);
assert.equal(isStockItemId('extra-pina'), true);

const blocked = blockedIds(['extra-tocino', 's-bbq']);
assert.equal(blocked.has('tocino'), true);
assert.equal(blocked.has('s-tamarindo'), true);
assert.equal(blocked.has('agua-fresca-500'), true);

const cart = [
  {
    uid: '1',
    menuItemId: 'boneless-chicos',
    name: 'Boneless Chicos',
    image: '',
    price_base: 119,
    quantity: 1,
    selections: [{ optionGroupId: 'boneless-ch-sauces', optionGroupId_label: 'Elige tu salsa', choices: ['s-tamarindo'] }],
  },
];
assert.match(cartStockError(cart, []) || '', /agotad/);
assert.equal(
  cartStockError(
    [
      {
        ...cart[0],
        selections: [{ optionGroupId: 'boneless-ch-sauces', optionGroupId_label: 'Elige tu salsa', choices: ['s-bbq'] }],
      },
    ],
    []
  ),
  null
);

console.log('branch-stock tests: ok');
