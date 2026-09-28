import { bagFits, bagUnits, BAG_UNIT_CAP, iangelCarries } from './bag-capacity';

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

function line(menuItemId: string, quantity: number) {
  return { menuItemId, quantity };
}

assert(bagFits([line('hamburguesa-tradicional', 12)]), '12 hamburguesas caben');
assert(!bagFits([line('hamburguesa-tradicional', 13)]), '13 hamburguesas no caben');
assert(bagFits([line('papas-jumbo', 9)]), '9 Papas Jumbo caben');
assert(!bagFits([line('boneless-jumbo', 10)]), '10 Boneless Jumbo no caben');
assert(bagFits([line('papas-jumbo', 8), line('torta-vaquera', 1)]), '8 jumbo y 1 torta caben');
assert(!bagFits([line('papas-jumbo', 8), line('torta-vaquera', 2)]), '8 jumbo y 2 tortas no caben');
assert(
  bagUnits([line('hamburguesa-tradicional', 12), line('refresco-grande', 6)]) === BAG_UNIT_CAP,
  'las bebidas no ocupan lugar'
);
assert(bagFits([line('papas-grandes', 12)]), 'papas grandes cuentan como caja chica');
assert(iangelCarries('self') && iangelCarries('wait_self'), 'IANGEL lleva self y espera');
assert(!iangelCarries('uber') && !iangelCarries('pickup'), 'Uber y recoger no usan la mochila');

console.log('bag-capacity tests: ok');
