# GUIA-AJUSTE10

Esta es la guía 10. La siguiente implementación se llama `GUIA-AJUSTE11`. El número sigue el de `GUIA-AJUSTE9` y es compartido entre IANGEL y Las Vaqueras.

## Cómo trabajar

1. Crear una rama nueva. No editar `main` directo.
2. Cambiar solo lo que pide el ajuste. El viaje, la foto de recojo, la ruta del mapa y el correo que ve el cliente se quedan como están, salvo que el ajuste los nombre.
3. Al terminar: commit, merge a `main` y deploy de los productos que hayan cambiado.
4. La guía del ajuste viaja en el mismo commit.

## Qué cuidó este ajuste

- Por cada venta pagada llega un solo aviso interno a iangels7997@gmail.com, y también a servicio@lasvaqueras.com.mx. Dice la sucursal, la dirección, el teléfono, el horario, si fue recoger o domicilio, el cliente, los platillos y lo cobrado. El envío va aparte.
- El cliente no llena nada nuevo. Su ticket, su promoción, la llegada, el en camino y el seguimiento de Uber salen igual, y ya no llegan en copia a iangels7997.
- En recoger, IANGEL y gestionar, el 15% sale de la comida que sí se cobra, ya con descuento. El envío no entra. Uber Direct sigue en 90% de la carta. Los pedidos ya cobrados no se recalculan.
- admin-iangel tiene la sección Cocina. Centro, Norte y Sur se ven Activa, Inactiva, o Turno abierto sin señal, y se actualizan solos.

## Repos de este ajuste

- `Las-Vaqueras-main`: aviso interno, copia oculta y el 15%.
- `ADMIN-IANGEL`: sección Cocina y el aviso de si el panel está abierto.
