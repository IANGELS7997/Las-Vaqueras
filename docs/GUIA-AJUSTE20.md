# GUIA-AJUSTE20

Esta es la guía 20. La siguiente implementación se llama `GUIA-AJUSTE21`. El número sigue el de `GUIA-AJUSTE19` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo la pastilla de abierto o cerrado y el aviso de ese fallo al cargar. El cobro, el efectivo, el ticket, el viaje y la cocina se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras. El flujo de avisos se publica junto con el cambio.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- La pastilla del encabezado ya no se guarda con la hora del build. La primera pintura no dice Abierto ni Cerrado.
- Un momento después, en el celular, se calcula la hora de Chihuahua y aparece la palabra correcta.
- Ese desfase era el error 423. React lo recuperaba y el pedido seguía, pero el correo y Sentry se llenaban.
- Si el mismo aviso de recuperación todavía aparece, no se guarda en Sentry ni se manda por correo.
- Un pago que no cierra, o la tarjeta que no cobró, sigue avisando.

## Qué decir en el local

Para el dueño: la página ya no manda ese correo de «Pasó algo inesperado» por el error 423. El pedido sigue igual.

Para cocina y caja: la pantalla no cambia.

Para el cliente: al entrar ve la pastilla un instante vacía y luego Abierto o Cerrado, según la hora de Chihuahua. Pedir no cambia.

## Repos de este ajuste

- `Las-Vaqueras-main`: la pastilla espera a la hora real y Sentry no reenvía ese error.
- Flujo n8n `Las Vaqueras: avisos dev`: el error 423 usa la frase ya conocida y no manda correo.
