# GUIA-AJUSTE13

Esta es la guía 13. La siguiente implementación se llama `GUIA-AJUSTE14`. El número sigue el de `GUIA-AJUSTE12` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa, el cobro y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El ticket de compra, el correo de pedido en camino, el de llegada y el de canje de promoción muestran debajo de sus datos la guía de pedidos 1 a 10, la misma de Promociones en el perfil.
- Los pedidos ya hechos van marcados. El pedido de ese correo queda resaltado. El 1, el 5 y el 10 se distinguen como promos. No se listan platillos de compras anteriores.
- La línea dice en qué pedido va. Al completar los 10, el texto es el del perfil: ya usó las promos del pedido 1, 5 y 10, y los 10 quedan marcados.
- El número sale de los pedidos pagados de ese perfil. Si el pedido todavía no está ligado, se busca el perfil por teléfono y este pedido cuenta como el siguiente. Si no hay perfil, la guía muestra solo ese pedido como el 1. Si la consulta falla, el correo sale igual, sin la guía.
- Solo el ticket de compra agrega: «Gracias por tu compra, {Nombre}. En Las Vaqueras preparamos tu pedido con gusto.»
- El aviso interno de compra y el correo de reembolso no cambian.

## Repos de este ajuste

- `Las-Vaqueras-main`: guía de pedidos en los correos al cliente y agradecimiento en el ticket.
