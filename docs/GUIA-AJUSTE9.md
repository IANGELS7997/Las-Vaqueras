# GUIA-AJUSTE9

Esta es la guía 9. La siguiente implementación se llama `GUIA-AJUSTE10`. El número sigue el de `GUIA-AJUSTE8` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa, el cobro y el ticket del cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- El ticket del correo, en un pedido Uber Direct, avisa que el envío va con Uber. Si el enlace ya existe, el mismo ticket trae el botón para seguir al repartidor.
- Cuando Uber confirma el enlace, llega un segundo correo a ese mismo cliente: Seguir con Uber Direct. No se repite si el enlace ya estaba.
- La página de rastreo del pedido muestra el mismo botón.
- El cobro, la foto de recojo y la ruta de IANGEL no cambian.

## Repos de este ajuste

- `Las-Vaqueras-main`: correo de seguimiento y rastreo del pedido.
- n8n `Las Vaqueras: pago exitoso`: el ticket del cliente.
