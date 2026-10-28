import { checkoutFieldChange } from './checkout-field';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const named = checkoutFieldChange('firstName', '', 'Ana', '');
check(named?.short === 'Nombre' && named.value === 'Ana' && named.phrase === 'el nombre', 'el nombre nuevo se avisa');

check(checkoutFieldChange('firstName', 'Ana', 'Ana', '') == null, 'salir sin cambiar no se avisa');
check(checkoutFieldChange('firstName', '', '   ', '') == null, 'vacío no se avisa');
check(checkoutFieldChange('firstName', '', 'Ana', 'Ana') == null, 'el mismo texto no se repite');
check(checkoutFieldChange('map', '', 'puerta', '') == null, 'el mapa no es un campo escrito');

const edited = checkoutFieldChange('phone', '6141112233', '6149998877', '6141112233');
check(edited?.value === '6149998877', 'un teléfono distinto sí se avisa');

console.log('checkout-field ok');
