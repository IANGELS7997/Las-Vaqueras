# GUIA-AJUSTE33

Esta es la guía 33. La siguiente implementación se llama `GUIA-AJUSTE34`. El número sigue al 32 y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El cobro, el reparto del rider y los botones de cocina se quedan como están. El pedido guarda el split que ya se cobró y se lo manda al panel.
3. Al terminar: commit, merge a `main` y deploy de la tienda. El panel y la función `iangel-ops` cambian en su repo.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Cada pedido guarda la comisión de Stripe y, si esta tarjeta descontó una comisión de efectivo, ese monto.
- El aviso al panel lleva el payout, la comisión de plataforma, Stripe y ese efectivo cobrado.
- El cobro del cliente no cambia. La comisión de efectivo se sigue restando del pago que Stripe transfiere.

## Qué decir en el local

Para el dueño: la tabla de ventas del panel muestra lo que ya se cobró, no una estimación.
