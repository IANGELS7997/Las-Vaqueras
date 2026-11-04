# GUIA-AJUSTE30

Esta es la guía 30. La siguiente implementación se llama `GUIA-AJUSTE31`. El número sigue al 29 del panel y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El cobro, el reparto de dinero, el ticket de pago y el workflow de pago en n8n se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de la tienda y del panel. La función `iangel-ops` no cambia.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- En cada pedido activo, cocina tiene el botón Aceptar pedido. Al pulsarlo, el Estado del pedido en el admin dice Cocina aceptó y llega un correo solo a iangels7997@gmail.com.
- Si ese correo no sale, el botón sigue diciendo Aceptar pedido. Un segundo toque, cuando ya quedó aceptado, no manda otro correo.
- Aceptar no traba los demás botones. Ya está listo, Entregar pedido, la clave y el pago siguen igual si nadie lo pulsa.
- Ya está listo, Entregar pedido que lo pone en camino, y Entregar pedido que autoriza la salida del rider avisan Cocina entregó. El Estado queda Listo para recoger, En camino o Salida autorizada.
- Entregar pedido de recoger que cierra el pedido, y Llegó el pedido al domicilio, avisan Cocina finalizó. El Estado queda Entregado.
- Esos correos van solo a Angel. Venta hecha sigue llegando también al dueño. El cliente no recibe estos avisos.
- Si el rider marca entregado, o un recoger se cierra solo por la hora, no sale este correo.
- Enviar clave y Reenviar clave, en cocina o en Pin a cliente, dejan el Estado con Clave enviada. El correo CLAVE es el mismo de antes y se manda otra vez en cada envío.
- Uber no tiene botones nuevos de entrega. Ahí solo está Aceptar pedido.
- En un pedido IANGEL con rider, el admin conserva el estado del rider y le suma el de cocina.

## Qué decir en el local

Para el dueño: cocina puede marcar que ya vio el pedido. El aviso le llega solo a Angel.

Para cocina: Aceptar pedido avisa que ya lo vieron. Entregar y la clave siguen como estaban.
