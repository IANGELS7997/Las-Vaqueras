# GUIA-AJUSTE17

Esta es la guía 17. La siguiente implementación se llama `GUIA-AJUSTE18`. El número sigue el de `GUIA-AJUSTE16`.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo el correo que se manda al confirmar la tarjeta. El efectivo, el canje, el ticket, el viaje y la cocina se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- La caja de la tarjeta sigue sin pedir el correo otra vez. El cliente ya lo escribió arriba.
- Al oprimir pagar, ese correo se le entrega a Stripe junto con el nombre y el teléfono.
- Stripe ya no corta el cobro por falta de correo.
- No se restaura el recibo de Stripe. El ticket lo sigue mandando Las Vaqueras.
- El efectivo y el canje de promoción no pasan por este botón.

## Qué decir en el local

Para el dueño: la tarjeta volvió a poder cobrarse. El cliente nuevo y el que ya pidió usan el mismo botón. El efectivo sigue igual. Los pedidos de hoy que se quedaron esperando pago no se cobran solos; el cliente tiene que volver a pagar.

Para cocina y caja: no cambia la pantalla. Un pago con tarjeta que sí pase debe sonar como siempre.

Para el cliente: llena sus datos, elige tarjeta y oprime pagar. No tiene que escribir el correo dos veces.

## Repos de este ajuste

- `Las-Vaqueras-main`: correo del cliente al confirmar la tarjeta.
