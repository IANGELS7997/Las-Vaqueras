# GUIA-AJUSTE16

Esta es la guía 16. La siguiente implementación se llama `GUIA-AJUSTE17`. El número sigue el de `GUIA-AJUSTE15`.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo el sondeo y el caché del stock público. El cobro, el ticket, el viaje y la cocina como pantalla se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- `GET /api/menu/stock` se puede cachear 60 segundos en el CDN, por sucursal. Un error no se cachea.
- El menú consulta ese stock cada 3 minutos, y deja de consultar si la pestaña no se ve.
- La cocina consulta pedidos cada 60 segundos. El latido también pasa a 60 segundos. «Sin señal» sigue siendo 3 minutos sin latido.
- Si la pantalla de cocina no está visible, deja de pedir la lista. Al volver, la pide enseguida.
- El seguimiento del pedido mantiene el aviso en vivo. El respaldo pasa de 4 segundos a 60, y se detiene si la pestaña no se ve.
- El cobro sigue leyendo el inventario real antes de aceptar el pago.

## Qué decir en el local

Para el dueño: la tienda sigue en el plan gratuito de Vercel. Esas 4 horas de CPU son el cupo del periodo. Si se acaban, Vercel apaga el sitio. Este ajuste hace que menú, cocina y seguimiento consulten menos. Precios, carrito y cobro se ven igual. Un pedido puede sonar e imprimirse hasta un minuto después del pago. Un agotado puede seguir en el menú unos minutos; al pagar, si ya no hay, el cobro no pasa. No pausar el proyecto. No dejar varias pestañas de la tienda abiertas. Esto alarga el cupo; no lo vuelve infinito.

Para cocina y caja: una sola pantalla de cocina al frente, despierta, con el turno iniciado. Si se minimiza, el pedido no suena hasta que vuelva a verse. El sonido y el ticket pueden tardar hasta 1 minuto. El pedido no se perdió. Al marcar agotado, cocina lo ve al momento; el celular del cliente puede tardar unos minutos. «Sin señal» sigue siendo 3 minutos sin contacto con el servidor.

Para el cliente: el sitio se ve igual. No tiene que borrar caché. Puede ver un platillo recién agotado y, al pagar, que ya no está. El estado del pedido sigue al momento cuando el aviso en vivo funciona. Si ese aviso falla, el estado puede tardar hasta un minuto.

## Repos de este ajuste

- `Las-Vaqueras-main`: caché del stock público y sondeos más lentos.
