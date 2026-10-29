import { isRecoveredHydrationNotice } from './hydration-notice';

function check(ok: boolean, message: string) {
  if (!ok) throw new Error(message);
}

const recovered =
  'Minified React error #423; visit https://reactjs.org/docs/error-decoder.html?invariant=423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.';

check(isRecoveredHydrationNotice(recovered), 'el 423 es la recuperación de la página');
check(isRecoveredHydrationNotice('Minified React error #418'), 'el 418 también');
check(isRecoveredHydrationNotice('Minified React error #425'), 'el 425 también');
check(isRecoveredHydrationNotice('Hydration failed because the initial UI does not match'), 'el texto de desarrollo también');
check(!isRecoveredHydrationNotice('La tarjeta no cobró'), 'un pago que no cierra sigue avisando');
check(!isRecoveredHydrationNotice('Failed to fetch'), 'un corte de red sigue avisando');
check(!isRecoveredHydrationNotice('Minified React error #31'), 'otro error de React sigue avisando');

console.log('hydration-notice ok');
