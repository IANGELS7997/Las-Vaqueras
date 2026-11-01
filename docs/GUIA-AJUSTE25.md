# GUIA-AJUSTE25

Esta es la guía 25. La siguiente implementación se llama `GUIA-AJUSTE26`. El número sigue al 24 de Admin-Iangel y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. El cobro, el reparto de dinero, el ticket de pago y el workflow de pago en n8n se quedan como están.
3. Al terminar: commit, merge a `main` y deploy de Las Vaqueras, del panel y de la función `iangel-ops`.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Cerrar tienda apaga la venta en Centro, Norte y Sur, como si estuvieran fuera de horario. Cocina no se apaga. No sale ningún correo.
- Si esa consulta falla, el sitio sigue el horario. El checkout sí rechaza la venta cuando la fila dice cerrada.
- 45 minutos después de entregado sale el correo de estrellas. Lo revisa un cron de Vercel cada 5 minutos. El comentario se escribe en la página del pedido. La copia oculta va solo a Angel. La calificación del rider no se mezcla. El workflow de pago en n8n no se toca.
- Posponer, en cocina, elige 5, 10, 15 o 20 minutos. La última elección sustituye a la anterior. Correo interno a Angel y correo al cliente con la hora nueva.
- Pin a cliente solo en Gestionar pedido. Angel escribe 4 dígitos, el cliente recibe el correo y cocina ve la misma clave.

## Qué decir en el local

Para el dueño: si la tienda se cierra por lluvia o nieve, el sitio se ve cerrado y los pedidos ya pagados siguen. Cocina puede posponer un pedido 5, 10, 15 o 20 minutos. La clave de entrega solo existe en los pedidos que la sucursal gestiona.
