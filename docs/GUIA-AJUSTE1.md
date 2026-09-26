# GUIA-AJUSTE1

Esta es la guía 1. La siguiente implementación se llama `GUIA-AJUSTE2`, y así se sigue contando. El número es uno por ajuste, compartido entre IANGEL y Las Vaqueras. No se reinicia en cada repositorio.

La copia de trabajo también está en `APP-PUREIANGEL/docs/GUIA-AJUSTE1.md`.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta, la navegación, el cobro, Uber Direct y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los dos productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- En el mapa, el botón Pedidos (cuando ya estás en el mapa y hay pedido) esconde la hoja grande y al tocarlo otra vez la vuelve a mostrar. Un pedido nuevo abre la hoja.
- Si hay 2 o más pedidos, se ven en una lista sobre el mapa, en el orden en que entraron. Esa lista sigue visible con la hoja escondida. Con un solo pedido no aparece.
- El mapa, el botón de entrega y la navegación se quedan en el pedido que entró primero. Abrir otro pedido muestra su detalle y no lo adelanta.
- Los recojos de la misma tienda pueden ir juntos. La entrega del más antiguo no se salta.
- Cada compra, la primera vez que queda pagada, manda un aviso interno a iangels7997@gmail.com con los datos del pedido. No sustituye el ticket del cliente. Si el pago ya estaba confirmado, no se vuelve a mandar.

## Repos de este ajuste

- `APP-PUREIANGEL`: mapa, hoja y lista.
- `Las-Vaqueras-main`: hora de llegada del pedido y aviso interno de compra.
