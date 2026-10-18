import { shapeSignalCustomer } from './signal-customer';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const home = shapeSignalCustomer({
  firstName: 'Ana',
  lastName: 'Ruiz',
  phone: '6141112233',
  email: 'ana@correo.com',
  branch: 'Sucursal Centro',
  how: 'delivery',
  street: 'Rio 10',
  extNumber: '12',
  intNumber: 'B',
  colonia: 'Centro',
  postalCode: '31000',
  references: 'Portón negro',
  pickupAt: '2026-10-19T01:00:00.000Z',
});
check(home.how === 'Domicilio', 'domicilio se dice en claro');
check(home.address === 'Rio 10 12, Int. B, Centro, 31000', 'la dirección junta calle, interior, colonia y código');
check(home.references === 'Portón negro', 'las referencias viajan');
check(home.pickupAt === 'No aplica', 'en domicilio la hora de recoger no aplica');
check(home.branch === 'Sucursal Centro', 'la sucursal viaja');

const store = shapeSignalCustomer({
  firstName: 'Luis',
  how: 'pickup',
  pickupAt: '2026-10-19T01:00:00.000Z',
});
check(store.how === 'Recoger en tienda', 'recoger se dice en claro');
check(store.address === 'Recoge en la sucursal', 'recoger no pide calle');
check(store.lastName === 'Todavía no lo escribió', 'un dato vacío se dice en claro');
check(store.pickupAt.includes('7:00'), 'la hora de recoger queda en Chihuahua');

const empty = shapeSignalCustomer({});
check(empty.how === 'Todavía no lo eligió', 'sin modo se dice que no eligió');
check(empty.address === 'Todavía no la escribió', 'sin dirección se dice que no la escribió');
check(empty.phone === 'Todavía no lo escribió', 'sin teléfono se dice que no lo escribió');

const card = shapeSignalCustomer({ phone: '4111 1111 1111 1111' });
check(card.phone === '[tarjeta]', 'un número de tarjeta no viaja');

console.log('signal-customer ok');
