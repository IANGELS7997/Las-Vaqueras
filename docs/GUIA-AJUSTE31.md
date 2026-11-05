# GUIA-AJUSTE31

Esta es la guía 31. La siguiente implementación se llama `GUIA-AJUSTE32`.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El workflow de pago en n8n sigue publicado. El nodo de Uber Direct sigue activo.
3. Al terminar: commit, merge a `main` y deploy.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El 15% del desarrollador sale solo de la comida que el cliente paga, ya con descuento. El envío no entra en ese 15%.
- Adrian recibe el resto de esa comida, menos su parte de Stripe, más el envío completo. Vale para recoger, IANGEL, Gestionar y Uber Direct.
- Stripe del cobro se reparte entre los dos según la comida. El centavo sobrante se queda con Adrian.
- Un IANGEL con tarjeta ya no manda un segundo pago de $50 al entregar, porque el envío salió en el cobro.
- Un pedido cobrado antes de este ajuste no se recalcula. Si ese envío todavía no se transfirió, el cierre de entrega puede mandarlo una vez.
- El efectivo no cambia: el 15% se anota sobre la comida y los $50 de IANGEL se cobran en la puerta.

## Qué decir en el local

Para el dueño: de cada pedido con tarjeta te llega el envío y lo que queda de la comida. Angel se queda el 15% de la comida.

Para cocina: los precios que ve el cliente no cambian.
